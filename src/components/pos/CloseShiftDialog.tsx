import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, DollarSign, CheckCircle, FileText, Download, Mail, Plus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { generateShiftReportPDF, generateShiftReportBase64 } from '@/utils/pdfGenerator';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { useParams } from 'react-router-dom';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';

interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    opened_at: string;
    opening_cash: number;
    total_sales: number;
    total_orders: number;
    shop_id: string;
    user_id: string;
    shop?: {
        name: string;
        logo_url: string | null;
        address: string;
        phone: string | null;
        owner_email: string | null;
    };
    user?: {
        email?: string;
        name: string;
    };
  };
  onShiftClosed: () => void;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price?: number;
  product?: {
    name: string;
  };
  subtotal: number;
}

export function CloseShiftDialog({ open, onOpenChange, session, onShiftClosed }: CloseShiftDialogProps) {
  const queryClient = useQueryClient();
  const { store } = useStoreContext();
  const { signOut, roles } = useAuth();
  const { storeSlug } = useParams();
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;
  const [closingCash, setClosingCash] = useState('');
  const [description, setDescription] = useState('');
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Fetch Shift Sales (POS Invoices) with Details
  const { data: shiftOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['shift-invoices', session.id],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const endTime = new Date().toISOString();

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          payments (
            amount,
            payment_method
          )
        `)
        .eq('shop_id', session.shop_id)
        .eq('staff_id', session.user_id)
        .gte('created_at', session.opened_at)
        .lte('created_at', endTime)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!invoices || invoices.length === 0) return [];

      return invoices.map((invoice: any) => {
        const sourceItems = Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : [];
        const invoiceItems = sourceItems.map((item: any, idx: number) => ({
          id: item.id || `${invoice.id}-${idx}`,
          quantity: item.quantity,
          unit_price: item.unit_price ?? item.price ?? 0,
          subtotal: item.subtotal ?? ((item.quantity || 0) * (item.unit_price ?? item.price ?? 0)),
          product: item.product ? { name: item.product.name } : item.product_name ? { name: item.product_name } : item.name ? { name: item.name } : undefined,
          name: item.name,
          product_name: item.product_name,
        }));

        return {
          ...invoice,
          order_code: invoice.invoice_number,
          source: 'pos',
          order_items: invoiceItems,
        };
      });
    },
    enabled: open,
  });

  // Fetch Shift Refunds to adjust Expected Cash
  const { data: shiftRefunds, refetch: refetchRefunds } = useQuery({
    queryKey: ['shift-refunds', session.id],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
        const { data, error } = await supabase
            .from('refunds')
            .select('total_amount,created_at,order:orders!inner(payment_method)')
            .eq('staff_id', session.user_id)
            .gte('created_at', session.opened_at);
            
        if (error) throw error;
        return data;
    },
    enabled: open
  });

  const totalMoneyRefunds = shiftRefunds?.reduce((acc, refund) => {
    // Check if the original order was paid in cash or mobile money.
    const paymentMethod = (refund.order as any)?.payment_method;
    if (paymentMethod === 'cash' || paymentMethod === 'mobile_money') {
        return acc + refund.total_amount;
    }
    return acc;
  }, 0) || 0;

  // New accurate calculation using split payments
  const getTotalsByMethod = () => {
    let cash = 0, momo = 0, card = 0, wallet = 0;
    
    shiftOrders?.forEach(order => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((p: any) => {
          const amount = Number(p.amount) || 0;
          if (p.payment_method === 'cash') cash += amount;
          else if (p.payment_method === 'mobile_money') momo += amount;
          else if (p.payment_method === 'card') card += amount;
          else if (p.payment_method === 'wallet') wallet += amount;
        });
      } else {
        // Fallback for any legacy data
        const amount = Number(order.total_amount) || 0;
        if (order.payment_method === 'cash') cash += amount;
        else if (order.payment_method === 'mobile_money') momo += amount;
        else if (order.payment_method === 'card') card += amount;
        else if (order.payment_method === 'wallet') wallet += amount;
      }
    });
    
    return { cash, momo, card, wallet };
  };

  const { cash: totalCashSales, momo: totalMobileMoneySales, card: totalCardSales, wallet: totalWalletSales } = getTotalsByMethod();

  const totalCashAndMobileMoneySales = totalCashSales + totalMobileMoneySales;
  const totalCardAndWalletSales = totalCardSales + totalWalletSales;

  // Calculate Total Sales from all orders to ensure consistency
  // This overrides the potentially stale/incorrect value in pos_sessions table
  const calculatedTotalSales = shiftOrders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0;
  const calculatedTotalOrders = shiftOrders?.length || 0;

  const expectedCashOnly = session.opening_cash + totalCashSales - totalMoneyRefunds;
  const expectedCashWithMobile = session.opening_cash + totalCashAndMobileMoneySales - totalMoneyRefunds;
  const closingCashNum = parseFloat(closingCash) || 0;
  const difference = closingCashNum - expectedCashWithMobile;

  // Fetch Branch Manager, Finance Staff, and Current User Email
  const { data: emails } = useQuery({
    queryKey: ['shift-emails', session.shop_id],
    queryFn: async () => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get branch managers and finance staff for this shop
        const { data: staffRoles } = await supabase
            .from('user_roles')
            .select('user_id, role, users!inner(email)')
            .eq('shop_id', session.shop_id)
            .in('role', ['branch_manager', 'accountant', 'finance_staff']);
            
        const managerEmails = staffRoles?.map((sr: any) => sr.users?.email).filter(Boolean) || [];
            
        return {
            currentUserEmail: user?.email,
            ownerEmail: session.shop?.owner_email,
            managerEmails
        };
    },
    enabled: open
  });

  // Auto-populate manager and finance emails on dialog open
  useEffect(() => {
    if (open && emails?.managerEmails?.length > 0) {
      const newEmails = emails.managerEmails.filter((email: string) => !additionalRecipients.includes(email) && email !== emails.currentUserEmail && email !== emails.ownerEmail);
      if (newEmails.length > 0) {
        setAdditionalRecipients(prev => [...new Set([...prev, ...newEmails])]);
      }
    }
  }, [open, emails]);

  // Fetch Current Inventory Snapshot
  const { data: inventory, refetch: refetchInventory } = useQuery({
    queryKey: ['shop-inventory-snapshot', session.shop_id],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .select(`
          product_id,
          stock,
          product:products(name, category)
        `)
        .eq('shop_id', session.shop_id);

      if (error) throw error;
      return data?.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Unknown',
        category: item.product?.category,
        quantity: item.stock
      })) || [];
    },
    enabled: open,
  });

  // Fetch Inventory Reconciliation Data
  const { data: inventoryReconciliation, refetch: refetchReconciliation } = useQuery({
    queryKey: ['inventory-reconciliation', session.id],
    staleTime: 0, // Ensure we always get fresh data
    gcTime: 0,    // Don't keep old reconciliation data in cache
    queryFn: async () => {
      console.log('Fetching inventory reconciliation for session:', session.id);

      // Fetch opening inventory snapshot (at shift start, if available)
      // We fetch all snapshots for this session ordered by time, 
      // then we'll group them by their creation time to find the earliest set.
      const { data: allSnapshots } = await supabase
        .from('pos_session_inventory_snapshots')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      console.log('All snapshots for session:', allSnapshots);

      // Filter for only the opening snapshot (the first set of records saved)
      let openingSnapshots: any[] = [];
      if (allSnapshots && allSnapshots.length > 0) {
        const firstTimestamp = allSnapshots[0].created_at;
        // Allow a small buffer (e.g., 5 seconds) in case records were inserted slightly apart
        const firstTime = new Date(firstTimestamp).getTime();
        openingSnapshots = allSnapshots.filter(snap => {
          const snapTime = new Date(snap.created_at).getTime();
          return Math.abs(snapTime - firstTime) < 5000;
        });
      }

      console.log('Identified opening snapshots:', openingSnapshots);

      // Fetch closing inventory from shop_inventory (current state)
      const { data: currentInventory } = await supabase
        .from('shop_inventory')
        .select('product_id, stock, price, product:products(name, category)')
        .eq('shop_id', session.shop_id);

      console.log('Current inventory:', currentInventory);

      // Fetch inventory transactions during this shift (stock in/out)
      const { data: inventoryTransactions } = await supabase
        .from('inventory_transactions')
        .select('product_id, quantity, transaction_type')
        .eq('shop_id', session.shop_id)
        .gte('created_at', session.opened_at)
        .order('created_at', { ascending: true });

      console.log('Inventory transactions during shift:', inventoryTransactions);

      // Calculate added stock from inventory transactions (stock in = positive, stock out = negative)
      const addedStockMap = new Map<string, number>();
      inventoryTransactions?.forEach(tx => {
        const current = addedStockMap.get(tx.product_id) || 0;
        if (tx.transaction_type === 'stock_in') {
          addedStockMap.set(tx.product_id, current + (tx.quantity || 0));
        } else if (tx.transaction_type === 'stock_out') {
          addedStockMap.set(tx.product_id, current - (tx.quantity || 0));
        }
      });
      console.log('Added stock map:', Array.from(addedStockMap.entries()));

      // Create a mapping from product name to product_id for matching
      const productNameToIdMap = new Map<string, string>();
      currentInventory?.forEach(inv => {
        if (inv.product?.name) {
          productNameToIdMap.set(inv.product.name.toLowerCase(), inv.product_id);
        }
      });
      console.log('Product name to ID map:', Array.from(productNameToIdMap.entries()));

      // Get quantities sold per product from invoices (items_snapshot)
      const soldQuantities = new Map<string, { quantity: number; unit_price: number; product_name: string }>();
      
      // If shiftOrders is empty, try fetching invoices directly
      const invoicesToProcess = shiftOrders && shiftOrders.length > 0 ? shiftOrders : [];
      
      if (invoicesToProcess.length === 0) {
        console.log('No shiftOrders, trying to fetch invoices directly...');
        const endTime = new Date().toISOString();
        const { data: directInvoices, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('shop_id', session.shop_id)
          .eq('staff_id', session.user_id)
          .gte('created_at', session.opened_at)
          .lte('created_at', endTime)
          .order('created_at', { ascending: false });
        
        console.log('Direct invoices:', directInvoices, 'Error:', invoiceError);
        if (directInvoices) {
          invoicesToProcess.push(...directInvoices);
        }
      }

      invoicesToProcess.forEach((invoice: any) => {
        const sourceItems = Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : [];
        console.log('Invoice items_snapshot:', sourceItems);
        sourceItems.forEach((item: any) => {
          const productId = item.product_id || item.product?.id;
          const productName = item.product?.name || item.product_name || item.name;
          console.log('Item:', { productId, productName, quantity: item.quantity, fullItem: item });
          
          // Use product_id if available, otherwise try to match by product name
          let key = productId;
          if (!key && productName) {
            key = productNameToIdMap.get(productName.toLowerCase()) || productName;
          }
          key = key || productName || 'Unknown';
          
          const existing = soldQuantities.get(key) || { quantity: 0, unit_price: 0, product_name: productName || 'Unknown' };
          existing.quantity += item.quantity || 0;
          existing.unit_price = item.unit_price ?? item.price ?? existing.unit_price;
          existing.product_name = productName || existing.product_name;
          soldQuantities.set(key, existing);
        });
      });

      console.log('Sold quantities map:', Array.from(soldQuantities.entries()));

      // Build reconciliation data - use product_id as key
      const productMap = new Map<string, any>();

      // Initialize with current inventory using product_id as key
      currentInventory?.forEach(inv => {
        productMap.set(inv.product_id, {
          product_id: inv.product_id,
          product_name: inv.product?.name || 'Unknown',
          category: inv.product?.category,
          unit_price: inv.price || 0,
          opening_stock: 0,
          added_stock: 0,
          closing_stock: inv.stock || 0,
          sold_quantity: 0,
          current_stock_value: 0,
        });
      });

      // If we have opening snapshots, override opening stock
      openingSnapshots?.forEach(snap => {
        const key = snap.product_id;
        if (productMap.has(key)) {
          const item = productMap.get(key);
          item.opening_stock = snap.quantity || 0;
        } else {
          productMap.set(key, {
            product_id: key,
            product_name: snap.product_name || 'Unknown',
            category: snap.category,
            unit_price: 0,
            opening_stock: snap.quantity || 0,
            added_stock: 0,
            closing_stock: 0,
            sold_quantity: 0,
            current_stock_value: 0,
          });
        }
      });

      // Calculate sold quantities from invoices - use product_id as key
      soldQuantities.forEach((sold, key) => {
        console.log('Processing sold item:', { key, sold, hasInMap: productMap.has(key) });
        if (productMap.has(key)) {
          const reconcItem = productMap.get(key);
          reconcItem.sold_quantity = sold.quantity;
          reconcItem.unit_price = sold.unit_price || reconcItem.unit_price;
        } else {
          // Add products that were sold but not in current inventory
          console.log('Adding sold product not in inventory:', sold);
          productMap.set(key, {
            product_id: key,
            product_name: sold.product_name,
            category: '',
            unit_price: sold.unit_price || 0,
            opening_stock: 0,
            added_stock: 0,
            closing_stock: 0,
            sold_quantity: sold.quantity,
            current_stock_value: 0,
          });
        }
      });

      // Set added stock from inventory transactions
      addedStockMap.forEach((added, productId) => {
        if (productMap.has(productId)) {
          const item = productMap.get(productId);
          item.added_stock = added;
        }
      });

      // Calculate current stock value (closing_stock * unit_price)
      productMap.forEach(item => {
        item.current_stock_value = item.closing_stock * item.unit_price;
      });

      const result = Array.from(productMap.values());
      console.log('Reconciliation result:', result);
      // Return all items from current inventory to show full reconciliation
      return result;
    },
    enabled: open,
  });

  // Refetch all data when dialog opens to ensure fresh state
  useEffect(() => {
    if (open) {
      refetchOrders();
      refetchRefunds();
      refetchInventory();
      refetchReconciliation();
    }
  }, [open, refetchOrders, refetchRefunds, refetchInventory, refetchReconciliation]);

  const handleAddRecipient = () => {
    if (newRecipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient)) {
      if (!additionalRecipients.includes(newRecipient)) {
        setAdditionalRecipients([...additionalRecipients, newRecipient]);
        setNewRecipient('');
      } else {
          toast.error("Recipient already added");
      }
    } else {
      toast.error('Invalid email address');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setAdditionalRecipients(additionalRecipients.filter(e => e !== email));
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    await generateShiftReportPDF({
        session,
        shiftOrders: shiftOrders || [],
        closingCash: closingCashNum,
        expectedCash: expectedCashWithMobile,
        description,
        currency,
        inventoryReconciliation: inventoryReconciliation || undefined
    });
    setIsGeneratingPdf(false);
  };

  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      setIsSending(true);
      const now = new Date();
      const closedAtIso = now.toISOString();

      // Calculate duration
      const start = new Date(session.opened_at);
      const diffMs = now.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const durationStr = `${hours}h ${minutes}m`;

      // Update session
      const { error } = await supabase
        .from('pos_sessions')
        .update({
          closed_at: closedAtIso,
          closing_cash: closingCashNum,
          expected_cash: expectedCashWithMobile,
          notes: description,
          status: 'closed',
          total_sales: calculatedTotalSales,
          total_orders: calculatedTotalOrders
        })
        .eq('id', session.id);

      if (error) throw error;

      // Save Inventory Snapshot
      if (inventory && inventory.length > 0) {
        const snapshotData = inventory.map(item => ({
          session_id: session.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity
        }));

        const { error: snapshotError } = await supabase
          .from('pos_session_inventory_snapshots')
          .insert(snapshotData);

        if (snapshotError) {
             console.error("Failed to save inventory snapshot:", snapshotError);
             toast.warning("Failed to save inventory snapshot");
        }
      }
      
      // Send Email Notification
      try {
        const recipients = [
            emails?.currentUserEmail,
            emails?.ownerEmail,
            ...additionalRecipients
        ].filter(Boolean) as string[];

        // Deduplicate recipients
        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length > 0) {
            const pdfBase64 = generateShiftReportBase64({
                session: { ...session, closed_at: closedAtIso },
                shiftOrders: shiftOrders || [],
                closingCash: closingCashNum,
                expectedCash: expectedCashWithMobile,
                description,
                currency,
                inventoryReconciliation: inventoryReconciliation || undefined
            });

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h1 style="color: #2563eb;">End of Shift Report</h1>
                    <p><strong>Shop:</strong> ${session.shop?.name}</p>
                    <p><strong>Staff:</strong> ${session.user?.name}</p>
                    <p><strong>Shift Opened:</strong> ${format(new Date(session.opened_at), 'MMM d, HH:mm')}</p>
                    <p><strong>Shift Closed:</strong> ${format(now, 'MMM d, HH:mm')}</p>
                    <p><strong>Shift Duration:</strong> ${durationStr}</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                        <h3 style="margin-top: 0; color: #1f2937;">Financial Summary</h3>
                        <p style="margin: 5px 0;"><strong>Total Sales:</strong> ${formatCurrency(session.total_sales, currency)}</p>
                        <p style="margin: 5px 0;"><strong>Expected Cash + Mobile:</strong> ${formatCurrency(expectedCash, currency)}</p>
                        <p style="margin: 5px 0;"><strong>Actual Cash:</strong> ${formatCurrency(closingCashNum, currency)}</p>
                        <p style="margin: 5px 0; color: ${difference !== 0 ? (difference > 0 ? 'green' : 'red') : 'black'}">
                            <strong>Variance:</strong> ${difference > 0 ? '+' : ''}${formatCurrency(difference, currency)}
                        </p>
                    </div>

                    ${description ? `
                    <div style="margin-top: 20px;">
                        <h3>Notes</h3>
                        <p style="background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            ${description}
                        </p>
                    </div>
                    ` : ''}

                    <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
                        This is an automated message from BakeSync. Please see the attached PDF for full details.
                    </p>
                </div>
            `;

            for (const recipient of uniqueRecipients) {
                const { error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: recipient,
                        subject: `End of Shift Report - ${session.shop?.name} - ${format(now, 'MMM d')}`,
                        html: emailHtml,
                        businessId: store?.id, // Use the actual business/tenant ID for email settings lookup
                        attachments: pdfBase64 ? [{
                            filename: `Shift_Report_${format(now, 'yyyyMMdd_HHmm')}.pdf`,
                            content: pdfBase64,
                            encoding: 'base64',
                            contentType: 'application/pdf'
                        }] : undefined
                    },
                });

                if (emailError) {
                    console.error(`Failed to send email to ${recipient}:`, emailError);
                    // Don't throw, just log
                }
            }
        }
      } catch (emailError) {
          console.error("Error in email sending process:", emailError);
          // Don't throw, allow shift close to proceed
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
      queryClient.invalidateQueries({ queryKey: ['pos-sessions'] });
      toast.success('Shift closed successfully. Reports are being sent.');
      onShiftClosed();
      onOpenChange(false);
      setIsSending(false);
      
      // Log out the user after closing the shift only if they are not a manager/admin
      const isManagerial = roles.some(r => ['super_admin', 'store_owner', 'admin', 'branch_manager', 'manager'].includes(r.role));
      if (!isManagerial) {
        const redirectPath = storeSlug ? `/${storeSlug}/login` : '/login';
        await signOut(redirectPath);
      }
    },
    onError: (error: Error) => {
        toast.error(error.message || 'Failed to close shift');
        setIsSending(false);
      },
  });

  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
    }
  }, [open, queryClient]);

  const shiftDuration = () => {
    const start = new Date(session.opened_at);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isFormValid = closingCash && description.length >= 50 && isVerified;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <div className="p-6 pb-4 shrink-0 border-b bg-background z-10 rounded-t-lg">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                End of Shift Report
            </DialogTitle>
            <DialogDescription>
                Review shift details, reconcile cash, and submit the final report.
            </DialogDescription>
            </DialogHeader>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth min-h-0 bg-background/50">
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Form Inputs */}
                <div className="space-y-6">
                    {/* Payment Method Breakdown */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                            <DollarSign className="h-4 w-4" /> Payment Systems Breakdown
                        </h3>
                        <Card className="bg-blue-50/50 dark:bg-blue-900/10">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span>Cash</span>
                                    </div>
                                    <span className="font-semibold">{formatCurrency(totalCashSales, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span>Mobile Money</span>
                                    </div>
                                    <span className="font-semibold">{formatCurrency(totalMobileMoneySales, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        <span>Card Payments</span>
                                    </div>
                                    <span className="font-semibold">{formatCurrency(totalCardSales, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        <span>Wallet / Credit</span>
                                    </div>
                                    <span className="font-semibold">{formatCurrency(totalWalletSales, currency)}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between items-center font-bold">
                                    <span>Total Sales Revenue</span>
                                    <span>{formatCurrency(calculatedTotalSales, currency)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cash Reconciliation */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                            <DollarSign className="h-4 w-4" /> Cash Reconciliation
                        </h3>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Opening Cash</span>
                                        <span className="font-semibold">{formatCurrency(session.opening_cash, currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Sales (Cash + Mobile)</span>
                                        <span className="font-semibold">{formatCurrency(totalCashAndMobileMoneySales, currency)}</span>
                                    </div>
                                    {totalMoneyRefunds > 0 && (
                                        <div className="flex justify-between text-sm text-red-500">
                                            <span>Refunds (Cash/Mobile)</span>
                                            <span>-{formatCurrency(totalMoneyRefunds, currency)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Expected Cash Only</span>
                                    <span className="font-semibold">{formatCurrency(expectedCashOnly, currency)}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">Opening cash + cash sales</div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Expected Cash + Mobile Money</span>
                                    <span className="text-xl font-bold">{formatCurrency(expectedCashWithMobile, currency)}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    Opening cash + cash sales + mobile money sales.
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="closing-cash">Actual Cash Count *</Label>
                                    <Input
                                        id="closing-cash"
                                        type="number"
                                        placeholder="Enter amount"
                                        value={closingCash}
                                        onChange={(e) => setClosingCash(e.target.value)}
                                        className={difference !== 0 && closingCash ? (difference < 0 ? 'border-red-500' : 'border-green-500') : ''}
                                    />
                                    {closingCash && (
                                        <div className={`text-sm font-medium text-right ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            Difference: {difference > 0 ? '+' : ''}{formatCurrency(difference, currency)}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Shift Notes */}
                    <div className="space-y-2">
                        <div className="flex justify-between border-b pb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Shift Notes
                            </h3>
                            <span className={`text-xs ${description.length < 50 ? 'text-red-500' : 'text-green-500'}`}>
                                {description.length}/50 chars
                            </span>
                        </div>
                        <Textarea
                        id="description"
                        placeholder="Describe shift activities, issues, handovers..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        />
                    </div>

                    {/* Recipients */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                            <Mail className="h-4 w-4" /> Report Recipients
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {emails?.currentUserEmail && (
                                <Badge variant="secondary">{emails.currentUserEmail} (You)</Badge>
                            )}
                            {emails?.ownerEmail && (
                                <Badge variant="outline">{emails.ownerEmail} (Owner)</Badge>
                            )}
                            {emails?.managerEmails?.map((email: string) => (
                                <Badge key={email} variant="outline">
                                    {email} (Manager/Finance)
                                </Badge>
                            ))}
                            {additionalRecipients.filter((e: string) => !emails?.managerEmails?.includes(e)).map(email => (
                                <Badge key={email} variant="default" className="gap-1 pl-2">
                                    {email}
                                    <X className="h-3 w-3 cursor-pointer hover:text-red-200" onClick={() => handleRemoveRecipient(email)} />
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Add recipient email..." 
                                value={newRecipient}
                                onChange={(e) => setNewRecipient(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                            />
                            <Button type="button" variant="outline" onClick={handleAddRecipient} size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Preview & Verification */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2 shrink-0">
                        <CheckCircle className="h-4 w-4" /> Report Preview & Verification
                    </h3>
                    
                    <Card className="bg-muted/20 border-dashed">
                        <CardHeader className="py-3 px-4 bg-muted/30 shrink-0 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-sm font-medium">Shift Summary</CardTitle>
                                <Button variant="ghost" size="sm" onClick={generatePDF} disabled={isGeneratingPdf} className="h-8">
                                    {isGeneratingPdf ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Download className="mr-2 h-3 w-3" />}
                                    PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <span className="text-muted-foreground">Staff:</span> <span className="font-medium text-right">{session.user?.name}</span>
                                <span className="text-muted-foreground">Shop:</span> <span className="font-medium text-right">{session.shop?.name}</span>
                                <span className="text-muted-foreground">Opened:</span> <span className="font-medium text-right">{format(new Date(session.opened_at), 'MMM d, HH:mm')}</span>
                                <span className="text-muted-foreground">Duration:</span> <span className="font-medium text-right">{shiftDuration()}</span>
                            </div>
                            
                            <div className="border-t pt-2">
                                <div className="flex justify-between font-semibold mb-2">
                                    <span>Total Sales</span>
                                    <span>{formatCurrency(calculatedTotalSales, currency)}</span>
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground mb-2">
                                    <div className="flex justify-between">
                                        <span>Cash Sales:</span>
                                        <span>{formatCurrency(totalCashSales, currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Mobile Money:</span>
                                        <span>{formatCurrency(totalMobileMoneySales, currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Card Payments:</span>
                                        <span>{formatCurrency(totalCardSales, currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Wallet / Credit:</span>
                                        <span>{formatCurrency(totalWalletSales, currency)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs mb-1">
                                    <span>Total Invoices</span>
                                    <span>{session.total_orders}</span>
                                </div>
                            </div>

                            <div className="border-t pt-2">
                                <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Invoice History</p>
                                <Accordion type="single" collapsible className="w-full">
                                    {shiftOrders?.map((order) => (
                                        <AccordionItem key={order.id} value={order.id} className="border-b-0 mb-1">
                                            <AccordionTrigger className="py-2 hover:no-underline hover:bg-muted/50 rounded px-2 text-xs">
                                                <div className="flex flex-col gap-1 w-full pr-2">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono">{order.order_code}</span>
                                                            {order.source && (
                                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                                    {order.source}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span>{formatCurrency(order.total_amount, currency)}</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {((order.order_items?.length ? order.order_items : order.items_snapshot || order.items || []) as OrderItem[]).map((item: OrderItem) => `${item.quantity}x ${item.product?.name || item.product_name || item.name || 'Item'}`).join(', ') || 'No items recorded'}
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-2 pb-2">
                                                <div className="space-y-2 pt-1">
                                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                                        <span>Time: {format(new Date(order.created_at), 'HH:mm:ss')}</span>
                                                        <span>{order.payment_method}</span>
                                                    </div>
                                                    <div className="text-xs space-y-1">
                                                        {((order.order_items?.length ? order.order_items : order.items_snapshot || order.items || []) as OrderItem[]).map((item: OrderItem) => (
                                                            <div key={item.id} className="flex justify-between">
                                                                <span>{item.quantity}x {item.product?.name || item.product_name || item.name || 'Item'}{typeof item.unit_price === 'number' ? ` @ ${formatCurrency(item.unit_price, currency)}` : ''}</span>
                                                                <span>{formatCurrency(item.subtotal, currency)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                    {(!shiftOrders || shiftOrders.length === 0) && (
                                        <p className="text-xs text-muted-foreground italic text-center py-2">No orders this session.</p>
                                    )}
                                </Accordion>
                            </div>

                            {/* Inventory Reconciliation */}
                            {inventoryReconciliation && inventoryReconciliation.length > 0 && (
                                <div className="border-t pt-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Inventory Reconciliation</p>
                                        <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            Total Value: {formatCurrency(inventoryReconciliation.reduce((sum, item) => sum + (item.current_stock_value || 0), 0), currency)}
                                        </div>
                                    </div>
                                    <ScrollArea className="h-48 w-full border rounded-md">
                                        <div className="min-w-[800px]">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-background z-10">
                                                    <TableRow>
                                                        <TableHead className="text-[10px] whitespace-nowrap">Product</TableHead>
                                                        <TableHead className="text-[10px] text-right whitespace-nowrap">Start</TableHead>
                                                        <TableHead className="text-[10px] text-right whitespace-nowrap">Added</TableHead>
                                                        <TableHead className="text-[10px] text-right whitespace-nowrap">Sold</TableHead>
                                                        <TableHead className="text-[10px] text-right whitespace-nowrap">End (Balance)</TableHead>
                                                        <TableHead className="text-[10px] text-right whitespace-nowrap">Value (End × Price)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {inventoryReconciliation.map((item, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="text-[10px] font-medium whitespace-nowrap">{item.product_name}</TableCell>
                                                            <TableCell className="text-[10px] text-right whitespace-nowrap">{item.opening_stock}</TableCell>
                                                            <TableCell className="text-[10px] text-right whitespace-nowrap">{item.added_stock}</TableCell>
                                                            <TableCell className="text-[10px] text-right text-red-600 whitespace-nowrap">-{item.sold_quantity}</TableCell>
                                                            <TableCell className="text-[10px] text-right font-bold whitespace-nowrap">{item.closing_stock}</TableCell>
                                                            <TableCell className="text-[10px] text-right font-mono text-blue-600 whitespace-nowrap">
                                                                {formatCurrency(item.current_stock_value, currency)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                    <div className="mt-2 p-2 bg-muted/30 rounded flex justify-between items-center">
                                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Final Stock Valuation</span>
                                        <span className="text-sm font-bold text-primary">
                                            {formatCurrency(inventoryReconciliation.reduce((sum, item) => sum + (item.current_stock_value || 0), 0), currency)}
                                        </span>
                                    </div>
                                </div>
                            )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                </div>
            </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background shrink-0 space-y-4 rounded-b-lg z-10">
            <div className="flex items-start space-x-2">
                <Checkbox id="verify" checked={isVerified} onCheckedChange={(checked) => setIsVerified(checked as boolean)} />
                <div className="grid gap-1.5 leading-none">
                    <label
                        htmlFor="verify"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        I confirm that I have reviewed the shift report details
                    </label>
                    <p className="text-xs text-muted-foreground">
                        By checking this, you certify that the cash count and sales records are accurate.
                    </p>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
                    Cancel
                </Button>
                <Button
                    onClick={() => closeShiftMutation.mutate()}
                    disabled={!isFormValid || closeShiftMutation.isPending || isSending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                >
                    {isSending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            Submit Report
                        </>
                    )}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
