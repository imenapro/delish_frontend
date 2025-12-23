import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TransactionDetails {
  id: string;
  created_at: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  purchase_price: number | null;
  transfer_from_location: string | null;
  transfer_to_location: string | null;
  product?: { name: string };
  shop?: { name: string };
  reason?: { name: string };
  created_by: string | null;
}

interface InventoryTransactionDetailsDialogProps {
  transaction: TransactionDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryTransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
}: InventoryTransactionDetailsDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Transaction-${transaction?.id}`,
  });

  const { data: creatorProfile } = useQuery({
    queryKey: ['profile', transaction?.created_by],
    queryFn: async () => {
      if (!transaction?.created_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', transaction.created_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!transaction?.created_by && open,
  });

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            View detailed information about this inventory transaction.
          </DialogDescription>
        </DialogHeader>

        <div ref={contentRef} className="space-y-4 p-4 border rounded-md bg-white text-black">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">
                {format(new Date(transaction.created_at), "PPP p")}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium capitalize">{transaction.transaction_type}</p>
            </div>
            <div>
              <p className="text-gray-500">Product</p>
              <p className="font-medium">{transaction.product?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500">Shop</p>
              <p className="font-medium">{transaction.shop?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500">Reason</p>
              <p className="font-medium">{transaction.reason?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500">Quantity</p>
              <p className={`font-medium ${transaction.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                {transaction.quantity > 0 ? "+" : ""}
                {transaction.quantity}
              </p>
            </div>

            {transaction.purchase_price && (
              <div>
                <p className="text-gray-500">Purchase Price</p>
                <p className="font-medium">{transaction.purchase_price.toLocaleString()}</p>
              </div>
            )}

            {transaction.transfer_from_location && (
              <div>
                <p className="text-gray-500">Transfer From</p>
                <p className="font-medium">{transaction.transfer_from_location}</p>
              </div>
            )}

            {transaction.transfer_to_location && (
              <div>
                <p className="text-gray-500">Transfer To</p>
                <p className="font-medium">{transaction.transfer_to_location}</p>
              </div>
            )}
            
            <div className="col-span-2">
              <p className="text-gray-500">Created By</p>
              <p className="font-medium">
                {creatorProfile?.name || transaction.created_by || "System"}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-gray-500">Notes</p>
              <p className="font-medium whitespace-pre-wrap">
                {transaction.notes || "No notes provided"}
              </p>
            </div>
          </div>
          
          {/* Print Header - visible only when printing */}
          <div className="hidden print:block pt-8 text-center text-xs text-gray-500">
            <p>Generated from BakeSync Inventory System</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => handlePrint()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
