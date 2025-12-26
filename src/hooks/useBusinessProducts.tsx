import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBusinessProducts(businessId: string | undefined) {
  return useQuery({
    queryKey: ['businessProducts', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      category,
      price,
      barcode,
      discount_price,
      promotion_description,
    }: {
      id: string;
      name?: string;
      description?: string | null;
      category?: string;
      price?: number;
      barcode?: string | null;
      discount_price?: number | null;
      promotion_description?: string | null;
    }) => {
      const updates: {
        name?: string;
        description?: string | null;
        category?: string;
        price?: number;
        barcode?: string | null;
        discount_price?: number | null;
        promotion_description?: string | null;
      } = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (price !== undefined) updates.price = price;
      if (barcode !== undefined) updates.barcode = barcode;
      if (discount_price !== undefined) updates.discount_price = discount_price;
      if (promotion_description !== undefined) updates.promotion_description = promotion_description;

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
