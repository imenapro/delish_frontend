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
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateShiftReportPDF, generateShiftReportBase64 } from '@/utils/pdfGenerator';
import { useStoreContext } from '@/contexts/StoreContext';
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
  product?: {
    name: string;
  };
  subtotal: number;
}

export function CloseShiftDialog({ open, onOpenChange, session, onShiftClosed }: CloseShiftDialogProps) {
  const queryClient = useQueryClient();
  const { store } = useStoreContext();
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;
  const [closingCash, setClosingCash] = useState('');
  const [description, setDescription] = useState('');
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const expectedCash = session.opening_cash + session.total_sales;
  const closingCashNum = parseFloat(closingCash) || 0;
  const difference = closingCashNum - expectedCash;

  // Fetch Shift Orders with Details
  const { data: shiftOrders } = useQuery({
    queryKey: ['shift-orders', session.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            product:products (name)
          )
        `)
        .eq('shop_id_origin', session.shop_id)
        .eq('seller_id', session.user_id) // Ensure we only get orders for this user session
        .gte('created_at', session.opened_at)
        .lte('created_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch Branch Manager Email and Current User Email
  const { data: emails } = useQuery({
    queryKey: ['shift-emails', session.shop_id],
    queryFn: async () => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get branch managers for this shop
        const { data: managers } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('shop_id', session.shop_id)
            .eq('role', 'branch_manager');
            
        // const managerEmails: string[] = [];
        // if (managers && managers.length > 0) {
        //     // Placeholder logic for managers
        // }

        return {
            currentUserEmail: user?.email,
            ownerEmail: session.shop?.owner_email,
            managerEmails: ['manager@example.com']
        };
    },
    enabled: open
  });

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
        expectedCash,
        description
    });
    setIsGeneratingPdf(false);
  };

  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      setIsSending(true);
      // Update session
      const { error } = await supabase
        .from('pos_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_cash: closingCashNum,
          expected_cash: expectedCash,
          notes: description,
          status: 'closed',
        })
        .eq('id', session.id);

      if (error) throw error;
      
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
                session,
                shiftOrders: shiftOrders || [],
                closingCash: closingCashNum,
                expectedCash,
                description,
                currency
            });

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h1 style="color: #2563eb;">End of Shift Report</h1>
                    <p><strong>Shop:</strong> ${session.shop?.name}</p>
                    <p><strong>Staff:</strong> ${session.user?.name}</p>
                    <p><strong>Shift Opened:</strong> ${format(new Date(session.opened_at), 'MMM d, HH:mm')}</p>
                    <p><strong>Shift Closed:</strong> ${format(new Date(), 'MMM d, HH:mm')}</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                        <h3 style="margin-top: 0; color: #1f2937;">Financial Summary</h3>
                        <p style="margin: 5px 0;"><strong>Total Sales:</strong> ${formatCurrency(session.total_sales, currency)}</p>
                        <p style="margin: 5px 0;"><strong>Expected Cash:</strong> ${formatCurrency(expectedCash, currency)}</p>
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
                        subject: `End of Shift Report - ${session.shop?.name} - ${format(new Date(), 'MMM d')}`,
                        html: emailHtml,
                        businessId: session.shop_id, // Assuming shop_id can serve as business context or we need store.id
                        attachments: pdfBase64 ? [{
                            filename: `Shift_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`,
                            content: pdfBase64,
                            type: 'application/pdf'
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
      queryClient.invalidateQueries({ queryKey: ['pos-sessions'] });
      toast.success('Shift closed successfully. Reports are being sent.');
      onShiftClosed();
      onOpenChange(false);
      setIsSending(false);
    },
    onError: (error: Error) => {
        toast.error(error.message || 'Failed to close shift');
        setIsSending(false);
      },
  });

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
                    {/* Cash Reconciliation */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                            <DollarSign className="h-4 w-4" /> Cash Reconciliation
                        </h3>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Expected Cash</span>
                                    <span className="text-xl font-bold">{formatCurrency(expectedCash, currency)}</span>
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
                            {additionalRecipients.map(email => (
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
                                    <span>{formatCurrency(session.total_sales, currency)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs mb-1">
                                    <span>Total Orders</span>
                                    <span>{session.total_orders}</span>
                                </div>
                            </div>

                            <div className="border-t pt-2">
                                <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Order History</p>
                                <Accordion type="single" collapsible className="w-full">
                                    {shiftOrders?.map((order) => (
                                        <AccordionItem key={order.id} value={order.id} className="border-b-0 mb-1">
                                            <AccordionTrigger className="py-2 hover:no-underline hover:bg-muted/50 rounded px-2 text-xs">
                                                <div className="flex justify-between w-full pr-2">
                                                    <span className="font-mono">{order.order_code}</span>
                                                    <span>{formatCurrency(order.total_amount, currency)}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-2 pb-2">
                                                <div className="space-y-1 pt-1">
                                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                                        <span>Time: {format(new Date(order.created_at), 'HH:mm:ss')}</span>
                                                        <span>{order.payment_method}</span>
                                                    </div>
                                                    <div className="text-xs space-y-1">
                                                        {order.order_items?.map((item: OrderItem) => (
                                                            <div key={item.id} className="flex justify-between">
                                                                <span>{item.quantity}x {item.product?.name}</span>
                                                                <span>{item.subtotal.toLocaleString()}</span>
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
