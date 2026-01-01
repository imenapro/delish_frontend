
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { PaymentMethodConfig, PaymentMethodsState } from './types';
import { toast } from 'sonner';

export function usePaymentMethods() {
  const { store } = useStoreContext();
  const queryClient = useQueryClient();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['payment-methods', store?.id],
    enabled: !!store?.id,
    queryFn: async (): Promise<PaymentMethodConfig[]> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('metadata')
        .eq('id', store!.id)
        .single();

      if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
      }

      const metadata = data.metadata as Record<string, any> | null;
      if (!metadata || !metadata.payment_methods) {
        return [];
      }

      return (metadata.payment_methods as PaymentMethodsState).methods || [];
    },
  });

  const savePaymentMethods = useMutation({
    mutationFn: async (newMethods: PaymentMethodConfig[]) => {
      if (!store?.id) throw new Error('No store selected');

      // First get current metadata to preserve other fields
      const { data: currentData, error: fetchError } = await supabase
        .from('businesses')
        .select('metadata')
        .eq('id', store.id)
        .single();

      if (fetchError) throw fetchError;

      const currentMetadata = (currentData.metadata as Record<string, any>) || {};
      
      const updatedMetadata = {
        ...currentMetadata,
        payment_methods: {
          methods: newMethods
        }
      };

      const { error } = await supabase
        .from('businesses')
        .update({ metadata: updatedMetadata })
        .eq('id', store.id);

      if (error) throw error;
      return newMethods;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', store?.id] });
      toast.success('Payment methods updated successfully');
    },
    onError: (error) => {
      console.error('Error saving payment methods:', error);
      toast.error('Failed to save payment methods');
    }
  });

  return {
    paymentMethods: paymentMethods || [],
    isLoading,
    savePaymentMethods
  };
}
