import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

export function ExpenseDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: '',
    category: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          ...data,
          shop_id: data.shop_id || null,
          amount: parseFloat(data.amount),
          recorded_by: user?.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Expense recorded",
        description: "Expense has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setOpen(false);
      setFormData({ shop_id: '', category: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Record Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record New Expense</DialogTitle>
          <DialogDescription>
            Add a new expense record for tracking
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Shop (Optional)</Label>
            <Select value={formData.shop_id} onValueChange={(value) => setFormData({ ...formData, shop_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select shop or leave blank for general" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Expense</SelectItem>
                {shops?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (RWF)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Expense Date</Label>
            <Input
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the expense"
            />
          </div>
        </div>
        <Button
          onClick={() => createExpenseMutation.mutate(formData)}
          disabled={createExpenseMutation.isPending || !formData.category || !formData.amount || !formData.description}
          className="w-full"
        >
          {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
