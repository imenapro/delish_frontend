import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Store, Loader2 } from 'lucide-react';

export default function CreateFirstShop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    slogan: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // 1. Create business first
      const businessSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: formData.name,
          slug: businessSlug,
          owner_id: user.id,
          status: 'trial',
          plan_type: 'trial',
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // 2. Create shop
      const shopSlug = `${businessSlug}-1`;
      
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          slogan: formData.slogan,
          slug: shopSlug,
          owner_id: user.id,
          owner_email: user.email,
          business_id: business.id,
          is_active: true,
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // 3. Create user role as store_owner
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'store_owner',
          business_id: business.id,
          shop_id: shop.id,
        });

      if (roleError) throw roleError;

      toast({
        title: 'Loja criada com sucesso!',
        description: 'Sua primeira loja foi configurada. Vamos começar!',
      });

      // Redirect to the shop dashboard
      navigate(`/${business.slug}/dashboard`);
    } catch (error: any) {
      console.error('Error creating shop:', error);
      toast({
        title: 'Erro ao criar loja',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Crie sua primeira loja</CardTitle>
          <CardDescription className="text-base">
            Vamos configurar sua loja em poucos passos. Você poderá criar mais lojas depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Minha Loja Principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Rua Principal, 123"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: +250 123 456 789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slogan">Slogan da Loja</Label>
              <Textarea
                id="slogan"
                value={formData.slogan}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                placeholder="Ex: A melhor loja da cidade!"
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Minha Loja'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
