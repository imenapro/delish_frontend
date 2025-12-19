import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import bakeryHero from '@/assets/bakery-hero.jpg';
import breadIcon from '@/assets/bread-icon.png';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { data: businesses, refetch: refetchBusinesses } = useUserBusinesses();

  const { data: shops } = useQuery({
    queryKey: ['active-shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !isLogin,
  });

  useEffect(() => {
    if (user && businesses) {
      // Redirect based on number of businesses
      if (businesses.length === 0) {
        navigate('/create-first-shop');
      } else if (businesses.length === 1) {
        const business = businesses[0];
        if (business.slug) {
          navigate(`/${business.slug}/dashboard`);
        } else {
          navigate('/my-stores');
        }
      } else {
        navigate('/my-stores');
      }
    }
  }, [user, businesses, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
          // Refetch businesses to determine redirect
          await refetchBusinesses();
        }
      } else {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        if (!phone.trim() || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
          toast.error('Please enter a valid phone number');
          setLoading(false);
          return;
        }
        if (!shopId) {
          toast.error('Please select a shop');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name, phone, shopId);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created! Please check your email to verify.');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Hero Image */}
      <div className="relative hidden flex-1 lg:block">
        <img
          src={bakeryHero}
          alt="Artisan bakery"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 flex items-center justify-center">
          <div className="max-w-md px-8 text-center">
            <img src={breadIcon} alt="Bakery Icon" className="mx-auto mb-6 h-24 w-24" />
            <h1 className="mb-4 text-4xl font-bold text-primary-foreground">BakeSync</h1>
            <p className="text-lg text-primary-foreground/90">
              Multi-Store Bakery Management System
            </p>
            <p className="mt-2 text-primary-foreground/80">
              Manage products, quotas, orders, and deliveries across all your bakery locations
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-[var(--shadow-strong)]">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Sign in to access your bakery dashboard'
                : 'Sign up to start managing your bakery'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+250788123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop">Select Your Shop</Label>
                    <Select value={shopId} onValueChange={setShopId} required>
                      <SelectTrigger id="shop">
                        <SelectValue placeholder="Choose a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops?.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@bakery.com"
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
