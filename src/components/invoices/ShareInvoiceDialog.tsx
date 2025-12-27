import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { MessageSquare, Mail, Smartphone, Copy, Check, Facebook, Twitter, Linkedin, Send, Calculator } from 'lucide-react';
import { toast } from 'sonner';

import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import { supabase } from '@/integrations/supabase/client';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
);

interface ShareInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function ShareInvoiceDialog({ open, onOpenChange, invoice }: ShareInvoiceDialogProps) {
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [smsType, setSmsType] = useState<'brief' | 'detailed'>('brief');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const COST_PER_UNIT = 15; // RWF per SMS unit

  const generateMessage = (type: 'brief' | 'detailed') => {
    if (!invoice) return '';

    const date = format(new Date(invoice.created_at), 'dd/MM/yyyy');
    const total = Number(invoice.total_amount).toLocaleString();
    const shopName = invoice.shop?.name || 'Delish Shop';
    
    // Use current host for link generation, or fallback to delish-app.com for dev/test
    const host = window.location.origin.includes('localhost') ? 'delish-app.com' : window.location.host;
    const invoiceLink = `${host}/i/${invoice.id.substring(0, 8)}`;

    if (type === 'brief') {
      return `Hello! Invoice #${invoice.invoice_number} from ${shopName}.
Date: ${date}
Total: ${total} RWF
View: ${invoiceLink}`;
    } else {
      const itemsList = invoice.items_snapshot
        ?.map((item: any) => `- ${item.quantity}x ${item.name} (${Number(item.price * item.quantity).toLocaleString()} RWF)`)
        .join('\n');

      return `Hello! Invoice #${invoice.invoice_number} from ${shopName}.
Date: ${date}
Total: ${total} RWF
Status: ${invoice.status}

Items:
${itemsList}

View full invoice: ${invoiceLink}
Thank you for your business!`;
    }
  };

  useEffect(() => {
    if (invoice) {
      // Pre-fill phone/email if available in customer_info
      if (invoice.customer_info?.phone) {
        setPhoneNumber(invoice.customer_info.phone);
      }
      if (invoice.customer_info?.email) {
        setEmail(invoice.customer_info.email);
      }

      const msg = generateMessage(smsType);
      setMessage(msg);
      setSubject(`Invoice #${invoice.invoice_number} from ${invoice.shop?.name || 'Delish Shop'}`);
    }
  }, [invoice, open, smsType]);

  const calculateSmsCost = (text: string) => {
    const length = text.length;
    const units = Math.ceil(length / 160) || 1;
    const cost = units * COST_PER_UNIT;
    return { length, units, cost };
  };

  const { length, units, cost } = calculateSmsCost(message);

  const handleSendSMS = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    let cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Auto-format for Rwanda (if starts with 07 or 7, prepend 250)
    if (cleanPhone.startsWith('07') && cleanPhone.length === 10) {
      cleanPhone = '250' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
      cleanPhone = '250' + cleanPhone;
    }

    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (smsType === 'brief' && length > 160) {
      toast.error('Brief SMS must be 160 characters or less. Switch to Detailed or shorten the message.');
      return;
    }

    setIsSendingSMS(true);
    try {
      // Don't modify the message again, use what's on screen (which is already formatted by generateMessage)
      const smsMessage = message; 

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: cleanPhone,
          message: smsMessage,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send SMS');

      // Update invoice customer_info with SMS metadata
      const updatedCustomerInfo = {
        ...invoice.customer_info,
        sms_history: [
          ...(invoice.customer_info?.sms_history || []),
          {
            sent_at: new Date().toISOString(),
            type: smsType,
            cost: cost,
            units: units,
            phone: cleanPhone
          }
        ]
      };

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ customer_info: updatedCustomerInfo })
        .eq('id', invoice.id);
      
      if (updateError) console.error('Error updating SMS history:', updateError);

      toast.success('SMS sent successfully!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleShare = async () => {
    let url = '';

    // Try to share PDF file natively first for WhatsApp and Email
    if (activeTab === 'whatsapp' || activeTab === 'email') {
      try {
        const pdf = generateInvoicePDF(invoice);
        const blob = pdf.output('blob');
        const file = new File([blob], `Invoice-${invoice.invoice_number}.pdf`, { type: 'application/pdf' });
        
        // Check if Web Share API with files is supported
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: subject,
            text: message,
          });
          toast.success('Invoice shared successfully');
          onOpenChange(false);
          return;
        }
      } catch (error) {
        console.error('Error sharing PDF:', error);
        toast.error('Could not attach PDF directly. Opening app instead.');
      }
    }

    if (activeTab === 'whatsapp') {
      // Basic phone validation
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }
      // Provide a download link hint since we can't attach file via URL scheme
      const msgWithLink = `${message}\n\n(PDF Invoice attached manually)`;
      url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgWithLink)}`;
    } else if (activeTab === 'sms') {
      // Add link for SMS
      const invoiceLink = `https://delish-app.com/invoice/${invoice.id}`;
      const smsMessage = `${message}\n\nView Invoice: ${invoiceLink}`;
      url = `sms:${phoneNumber}?body=${encodeURIComponent(smsMessage)}`;
    } else if (activeTab === 'email') {
      if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
      // Mailto fallback
      url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    }

    if (url) {
      window.open(url, '_blank');
      onOpenChange(false);
      toast.success('Sharing interface opened');
    }
  };

  const handleSocialShare = (platform: string) => {
    const invoiceUrl = `https://delish-app.com/invoice/${invoice?.id}`;
    // For social media, we use a shorter message
    const socialMessage = `Check out this invoice from ${invoice.shop?.name}`;
    const encodedText = encodeURIComponent(platform === 'whatsapp' ? message : socialMessage);
    const encodedUrl = encodeURIComponent(invoiceUrl);

    let shareUrl = '';

    switch (platform) {
      case 'whatsapp':
        // WhatsApp supports long text
        shareUrl = `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=600');
      toast.success(`Opened ${platform} sharing`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Message copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Invoice</DialogTitle>
          <DialogDescription>
            Choose a method to share this invoice with your customer.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
          </TabsList>

          <div className="py-4 space-y-4">
            {activeTab !== 'email' && (
              <>
              {activeTab === 'sms' && (
              <div className="bg-muted/30 p-4 rounded-lg border mb-4">
                 <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                     <Label className="text-base">SMS Options</Label>
                     <p className="text-xs text-muted-foreground">Select message detail level</p>
                   </div>
                   <div className="text-right">
                     <div className="flex items-center gap-2 justify-end text-sm font-medium">
                       <Calculator className="h-4 w-4 text-blue-500" />
                       <span>{units} Unit{units > 1 ? 's' : ''} ≈ {cost} RWF</span>
                     </div>
                     <p className={`text-xs ${length > 160 && smsType === 'brief' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                       {length} chars ({Math.ceil(length / 160)} SMS)
                     </p>
                   </div>
                 </div>

                 <RadioGroup 
                   value={smsType} 
                   onValueChange={(val) => setSmsType(val as 'brief' | 'detailed')}
                   className="grid grid-cols-2 gap-4"
                 >
                   <div>
                     <RadioGroupItem value="brief" id="brief" className="peer sr-only" />
                     <Label
                       htmlFor="brief"
                       className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                     >
                       <span className="text-sm font-semibold">Brief</span>
                       <span className="text-xs text-center mt-1 text-muted-foreground">Essential info only.<br/>Best for single unit.</span>
                     </Label>
                   </div>
                   <div>
                     <RadioGroupItem value="detailed" id="detailed" className="peer sr-only" />
                     <Label
                       htmlFor="detailed"
                       className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                     >
                       <span className="text-sm font-semibold">Detailed</span>
                       <span className="text-xs text-center mt-1 text-muted-foreground">Includes all items.<br/>Higher cost.</span>
                     </Label>
                   </div>
                 </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  placeholder="e.g. 250788123456" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Include country code for WhatsApp (e.g., 250)</p>
              </div>
              </>
            )}

            {activeTab === 'email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="customer@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs" 
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </Button>
              </div>
              <Textarea 
                id="message" 
                value={message} 
                className="h-32 text-sm bg-muted/50"
                readOnly
              />
            </div>
          </div>

          <div className="pt-2 pb-4 border-t mt-2">
             <Label className="text-xs text-muted-foreground mb-3 block text-center">Or share via social media</Label>
             <div className="flex gap-4 justify-center">
               <Button variant="outline" size="icon" className="h-10 w-10 rounded-full hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors" onClick={() => handleSocialShare('whatsapp')} title="Share on WhatsApp">
                 <WhatsAppIcon className="h-5 w-5" />
               </Button>
               <Button variant="outline" size="icon" className="h-10 w-10 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors" onClick={() => handleSocialShare('facebook')} title="Share on Facebook">
                 <Facebook className="h-5 w-5" />
               </Button>
               <Button variant="outline" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-50 hover:text-black hover:border-slate-200 transition-colors" onClick={() => handleSocialShare('twitter')} title="Share on X (Twitter)">
                 <Twitter className="h-4 w-4" />
               </Button>
               <Button variant="outline" size="icon" className="h-10 w-10 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors" onClick={() => handleSocialShare('linkedin')} title="Share on LinkedIn">
                 <Linkedin className="h-4 w-4" />
               </Button>
             </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {activeTab === 'sms' && (
               <Button onClick={handleSendSMS} disabled={isSendingSMS} className="bg-blue-600 hover:bg-blue-700">
                 {isSendingSMS ? (
                    <>Sending...</>
                 ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send SMS Now</>
                 )}
               </Button>
            )}
            <Button onClick={handleShare} variant={activeTab === 'sms' ? "secondary" : "default"}>
              {activeTab === 'whatsapp' ? 'Share via WhatsApp' : activeTab === 'sms' ? 'Open SMS App' : 'Share via Email'}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
