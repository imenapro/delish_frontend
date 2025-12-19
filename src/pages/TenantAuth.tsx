import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function TenantAuth() {
  const { store, loading, themeConfig, getTenantRoute } = useStoreContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Apply dynamic theme colors
    if (store) {
      document.documentElement.style.setProperty('--store-primary', store.primaryColor);
      document.documentElement.style.setProperty('--store-secondary', store.secondaryColor);
    }
  }, [store]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Store Not Found</CardTitle>
            <CardDescription>The store you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/super-admin')}>Go to Admin Panel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        toast.error('Authentication failed');
        setIsLoading(false);
        return;
      }

      // Check if user has access to this business
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('business_id, role')
        .eq('user_id', authData.user.id) as any;

      if (rolesError) throw rolesError;

      // Check if user has access to this specific business
      const hasAccess = userRoles?.some((ur: any) => ur.business_id === store.id);

      if (!hasAccess) {
        await supabase.auth.signOut();
        toast.error('You do not have access to this business');
        setIsLoading(false);
        return;
      }

      toast.success('Welcome back!');
      // Use full page redirect to ensure auth state is properly established
      window.location.href = getTenantRoute('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const bgStyle = themeConfig.bgImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${themeConfig.bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `linear-gradient(135deg, ${themeConfig.primaryColor}dd, ${themeConfig.secondaryColor}dd)`,
      };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="relative hidden flex-1 lg:block" style={bgStyle}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-md px-8 text-center text-white">
            {themeConfig.logoUrl && (
              <img
                src={themeConfig.logoUrl}
                alt={`${store.name} Logo`}
                className="mx-auto mb-6 h-24 w-24 rounded-full object-cover"
              />
            )}
            <h1 className="mb-4 text-4xl font-bold">{store.name}</h1>
            {store.slogan && (
              <p className="text-lg">{store.slogan}</p>
            )}
            <div className="mt-4 inline-block rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur-sm">
              {store.planType.toUpperCase()} Plan
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-4 lg:hidden text-center">
              {themeConfig.logoUrl && (
                <img
                  src={themeConfig.logoUrl}
                  alt={`${store.name} Logo`}
                  className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
                />
              )}
              <h2 className="text-2xl font-bold">{store.name}</h2>
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to {store.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                style={{
                  backgroundColor: themeConfig.primaryColor,
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 rounded-lg bg-muted p-3 text-xs">
              <p className="font-medium mb-2">Demo Credentials:</p>
              <p>Email: {store.ownerEmail}</p>
              <p>Password: owner123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
