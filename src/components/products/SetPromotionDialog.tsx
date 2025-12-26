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
import { AlertTriangle } from "lucide-react";

const formSchema = z.object({
  promotion_description: z.string().optional(),
});

interface Product {
  id: string;
  name: string;
  promotion_description?: string | null;
}

interface SetPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

export function SetPromotionDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: SetPromotionDialogProps) {
  const updateProduct = useUpdateProduct();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promotion_description: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        promotion_description: product.promotion_description || "",
      });
    }
  }, [product, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!product) return;

    try {
      const promotionDesc = values.promotion_description || null;

      await updateProduct.mutateAsync({
        id: product.id,
        promotion_description: promotionDesc,
      });

      toast.success(
        promotionDesc
          ? "Promotion set successfully"
          : "Promotion removed successfully"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error setting promotion:", error);
      toast.error("Failed to set promotion");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Set Promotion
          </DialogTitle>
          <DialogDescription>
            Set a promotion description for {product?.name}. Leave empty to remove.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promotion_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotion Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Buy 1 Get 1 Free"
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
                {updateProduct.isPending ? "Saving..." : "Save Promotion"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
