import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShopProduct {
  id: string;
  product_id: string;
  shop_id: string;
  price: number;
  stock: number;
  quota_per_day: number | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    image_url: string | null;
    barcode: string | null;
  };
}

export function useShopProducts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shopProducts', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('shop_inventory')
        .select(`
          id,
          product_id,
          shop_id,
          price,
          stock,
          quota_per_day,
          product:products (
            id,
            name,
            description,
            category,
            image_url,
            barcode,
            is_active
          )
        `)
        .eq('shop_id', shopId)
        .order('product(name)');

      if (error) throw error;
      
      // Filter out items where product is null or inactive
      const validItems = (data || []).filter(item => item.product && item.product.is_active !== false);
      
      return validItems as unknown as ShopProduct[];
    },
    enabled: !!shopId,
  });
}

export function useAddProductToShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      shopId,
      price,
      stock,
    }: {
      productId: string;
      shopId: string;
      price: number;
      stock: number;
    }) => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .insert({
          product_id: productId,
          shop_id: shopId,
          price,
          stock,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shopProducts', variables.shopId] });
    },
  });
}

export function useUpdateShopProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      shopId,
      price,
      stock,
    }: {
      id: string;
      shopId: string;
      price?: number;
      stock?: number;
    }) => {
      const updates: { price?: number; stock?: number } = {};
      if (price !== undefined) updates.price = price;
      if (stock !== undefined) updates.stock = stock;

      const { data, error } = await supabase
        .from('shop_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shopProducts', variables.shopId] });
    },
  });
}
