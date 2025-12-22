import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';

interface UserRole {
  role: 'super_admin' | 'branch_manager' | 'admin' | 'seller' | 'manager' | 'delivery' | 'customer' | 'store_keeper' | 'manpower' | 'accountant' | 'store_owner';
  shop_id?: string;
  business_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, phone: string, shopId: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only set loading if we're signing in or initial session
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            setLoading(true);
          }
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, shop_id, business_id')
        .eq('user_id', userId);

      if (error) throw error;
      setRoles(data || []);

      // Check if password change is required
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password, is_suspended')
        .eq('id', userId)
        .single();

      if (profile?.is_suspended) {
        await signOut();
        return;
      }

      setMustChangePassword(profile?.must_change_password || false);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, phone: string, shopId: string) => {
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
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, mustChangePassword, signIn, signUp, signOut }}>
      {mustChangePassword && user && (
        <PasswordChangeDialog
          open={mustChangePassword}
          userId={user.id}
          onSuccess={() => {
            setMustChangePassword(false);
            navigate('/');
          }}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
