import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { isCustomDomain } from '@/utils/domainMapping';

export type AppRole = Database['public']['Enums']['app_role'] | string;

export interface UserRole {
  role: AppRole;
  shop_id?: string;
  business_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string, phone: string, shopId: string, role?: string) => Promise<{ error: AuthError | null }>;
  signOut: (redirectPath?: string) => Promise<void>;
  getTenantLoginPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const navigate = useNavigate();
  const lastFetchedUserId = useRef<string | null>(null);
  const fetchRolesAbortController = useRef<AbortController | null>(null);
  const passwordChangeCompletedAt = useRef<number | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getTenantLoginPath = useCallback(() => {
    const hostname = window.location.hostname;
    const isCustom = isCustomDomain(hostname);
    
    if (isCustom) return '/login';
    
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const possibleSlug = pathParts[0];
    const globalRoutes = ['auth', 'register', 'super-admin', 'reset-password', 'i', 'dashboard'];
    
    if (possibleSlug && !globalRoutes.includes(possibleSlug)) {
      return `/${possibleSlug}/login`;
    }
    
    return '/auth';
  }, []);

  const signOut = useCallback(async (redirectPath?: string) => {
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    await supabase.auth.signOut();
    setRoles([]);
    lastFetchedUserId.current = null;
    if (fetchRolesAbortController.current) {
      fetchRolesAbortController.current.abort();
    }
    
    const defaultRedirect = getTenantLoginPath();
    navigate(redirectPath || defaultRedirect);
  }, [navigate, getTenantLoginPath]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set timer if user is logged in
    if (lastFetchedUserId.current) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('[useAuth] Session timeout due to inactivity');
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  }, [signOut]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    if (user) {
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });
      
      // Initialize timer
      resetInactivityTimer();
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  // Handle offline status
  useEffect(() => {
    const handleOffline = () => {
      console.log('[useAuth] Connection lost');
      // Optional: we could show a toast or auto-logout if requested
      // For now, let's just log it. The user asked to "protect them... when connection goes out"
      // Usually this means ensuring they can't perform actions while offline that might compromise security
      // or redirecting them to a safe place.
    };

    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  const fetchUserRoles = useCallback(async (userId: string) => {
    // Cancel previous fetch to avoid race conditions
    if (fetchRolesAbortController.current) {
      fetchRolesAbortController.current.abort();
    }
    const controller = new AbortController();
    fetchRolesAbortController.current = controller;

    try {
      console.log('[useAuth] Fetching roles for user:', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(controller.signal);

      if (error) throw error;
      
      if (controller.signal.aborted) return;

      // Define role priority for sorting (higher number = higher priority)
      const normalizeRole = (role: string) => role?.trim().toLowerCase();

      const ROLE_PRIORITY: Record<string, number> = {
        'super_admin': 100,
        'store_owner': 90,
        'owner': 90,
        'admin': 80,
        'branch_manager': 70,
        'manager': 70, // Alias for branch_manager
        'finance': 65,
        'accountant': 60,
        'distributor': 55,
        'production': 52,
        'seller': 50,
        'logistics': 45,
        'store_keeper': 40,
        'delivery': 30,
        'manpower': 20,
        'customer': 10,
      };

      const sortedRoles = (data || []).sort((a, b) => {
        const priorityA = ROLE_PRIORITY[normalizeRole(a.role) || ''] || 0;
        const priorityB = ROLE_PRIORITY[normalizeRole(b.role) || ''] || 0;
        return priorityB - priorityA; // Descending order
      });

      console.log('[useAuth] User roles fetched and sorted:', sortedRoles);
      setRoles(sortedRoles);

      // Check if password change is required
      // If we recently changed the password (within last 10 seconds), assume false to avoid race conditions with DB replication
      if (passwordChangeCompletedAt.current && (Date.now() - passwordChangeCompletedAt.current < 10000)) {
        console.log('[useAuth] Skipping profile fetch for password check - recently changed');
        setMustChangePassword(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal);
      
      if (profileError && profileError.code !== 'PGRST116') {
         // PGRST116 is "The result contains 0 rows" which is fine if profile missing? 
         // Actually profile should exist.
         console.error('Error fetching profile:', profileError);
      }

      if (controller.signal.aborted) return;

      if (profile?.is_suspended) {
        await signOut();
        return;
      }

      console.log('[useAuth] Profile fetched:', profile);
      setMustChangePassword(profile?.must_change_password || false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useAuth] Fetch aborted');
        return;
      }
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [signOut]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Optimization: Only fetch roles if user changed or it's a fresh sign-in
          // This prevents re-fetching on TOKEN_REFRESHED or focus events
          const shouldFetch = 
            session.user.id !== lastFetchedUserId.current || 
            event === 'SIGNED_IN' || 
            event === 'INITIAL_SESSION';

          if (shouldFetch) {
            // Only set loading if it's an initial session or if the user has actually changed.
            // This prevents the UI from unmounting (and resetting state) when the session is just refreshed/recovered for the same user.
            if (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && session.user.id !== lastFetchedUserId.current)) {
              setLoading(true);
            }
            
            // Update the ref immediately to prevent race conditions
            lastFetchedUserId.current = session.user.id;
            
            setTimeout(() => {
              fetchUserRoles(session.user.id);
            }, 0);
          }
        } else {
          lastFetchedUserId.current = null;
          setRoles([]);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Initial load always fetches
        lastFetchedUserId.current = session.user.id;
        fetchUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, phone: string, shopId: string, role?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          phone: phone,
          shop_id: shopId,
          role: role || 'customer',
        }
      }
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, mustChangePassword, signIn, signUp, signOut, getTenantLoginPath }}>
      {mustChangePassword && user && (
        <PasswordChangeDialog
          open={mustChangePassword}
          userId={user.id}
          onSuccess={() => {
            setMustChangePassword(false);
            passwordChangeCompletedAt.current = Date.now();
            // Re-fetch to ensure state is synced with DB and cancel any stale pending fetches
            // Note: fetchUserRoles checks passwordChangeCompletedAt to avoid reading stale "true" value
            fetchUserRoles(user.id);
          }}
          onClose={() => setMustChangePassword(false)}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
