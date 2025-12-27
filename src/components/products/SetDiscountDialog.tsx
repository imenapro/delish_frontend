import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateProduct } from "@/hooks/useBusinessProducts";
import { toast } from "sonner";
import { Tag } from "lucide-react";

const formSchema = z.object({
  discount_price: z.string().optional(),
});

interface Product {
  id: string;
  name: string;
  price: number;
  discount_price?: number | null;
}

interface SetDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

export function SetDiscountDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: SetDiscountDialogProps) {
  const updateProduct = useUpdateProduct();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      discount_price: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        discount_price: product.discount_price ? String(product.discount_price) : "",
      });
    }
  }, [product, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!product) return;

    try {
      const discountPrice = values.discount_price ? parseFloat(values.discount_price) : null;

      await updateProduct.mutateAsync({
        id: product.id,
        discount_price: discountPrice,
      });

      toast.success(
        discountPrice
          ? "Discount set successfully"
          : "Discount removed successfully"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error setting discount:", error);
      toast.error("Failed to set discount");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Set Discount Price
          </DialogTitle>
          <DialogDescription>
            Set a discounted price for {product?.name}. Leave empty to remove discount.
            Current Price: {product?.price} RWF
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="discount_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Price (RWF)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 4500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? "Saving..." : "Save Discount"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
