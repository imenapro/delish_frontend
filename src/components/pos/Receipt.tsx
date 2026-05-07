import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { InvoiceTemplateRenderer } from '@/components/invoices/InvoiceTemplateRenderer';
import { InvoiceData } from '@/components/invoices/types';
import { InvoiceSettings } from '@/contexts/StoreContext';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptShop {
  name: string;
  address: string;
  phone: string;
  city: string;
  country?: string;
}

interface ReceiptBusiness {
  website?: string;
  logo_url?: string;
  metadata?: {
    registration_number?: string;
  };
}

interface ReceiptOrder {
  order_code: string;
  created_at: string;
  invoice_number?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method?: string;
}

interface ReceiptProps {
  order: ReceiptOrder;
  items: ReceiptItem[];
  shop: ReceiptShop;
  business?: ReceiptBusiness;
  payment?: {
    amountPaid: number;
    change: number;
    splitPayments?: { method: string; amount: number }[];
  };
  onCreateBalanceCase?: () => void;
  width?: string;
  currency?: string;
  taxBreakdown?: { name: string; rate: number; amount: number; type?: string }[];
  invoiceSettings?: InvoiceSettings;
  templateId?: string;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ order, items, shop, business, payment, onCreateBalanceCase, width = '80mm', currency = DEFAULT_SYSTEM_CURRENCY, taxBreakdown, invoiceSettings, templateId }, ref) => {
    if (!order) return null;

    // Use selected invoice template if available
    if (invoiceSettings && templateId) {
      const invoiceData: InvoiceData = {
        invoiceNumber: order.invoice_number || order.order_code,
        date: order.created_at,
        businessName: shop?.name || 'Shop',
        businessAddress: shop?.address || '',
        businessPhone: shop?.phone || '',
        businessEmail: '', 
        businessLogo: business?.logo_url,
        customerName: order.customer_phone ? 'Customer' : 'Walk-in Customer',
        customerAddress: '',
        customerEmail: '',
        customerPhone: order.customer_phone || '',
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        })),
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        tax: taxBreakdown?.reduce((sum, t) => sum + t.amount, 0) || 0,
        total: order.total_amount,
        currency: currency,
        status: 'paid',
        paymentMethod: order.payment_method || 'cash',
        notes: ''
      };

      return (
        <div ref={ref} style={{ width }} className="bg-white">
          <InvoiceTemplateRenderer 
            templateId={templateId} 
            data={invoiceData} 
            settings={invoiceSettings} 
            isCompact={true} 
          />
        </div>
      );
    }

    // Format address components
    const formatAddress = (address: string) => {
      if (!address) return [];
      // Try to split by comma if it looks like a single line address
      if (address.includes(',')) {
        return address.split(',').map(part => part.trim());
      }
      return [address];
    };

    const addressLines = formatAddress(shop?.address);

    // Generate QR Code data
    const qrData = JSON.stringify({
      shop: shop?.name,
      contact: shop?.phone,
      web: business?.website || 'www.bakesync.com',
      reg: business?.metadata?.registration_number,
      ref: order.order_code,
      date: order.created_at
    });

    return (
      <div ref={ref} className="bg-white text-black p-2 mx-auto font-mono text-[12px] leading-tight" style={{ width: width, minHeight: '100mm' }}>
        {/* Header Section */}
        <div className="mb-6">
          {/* Top Row: Address (Left) and Phone (Right) */}
          <div className="flex justify-between items-start mb-4 text-[10px]">
             {/* 2. Physical Address (Top-Left) */}
             <div className="text-left w-[60%]">
                {addressLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                <div className="mt-1">{shop?.city}, {shop?.country || 'Rwanda'}</div>
             </div>

             {/* 1. Phone Number (Top-Right) */}
             <div className="text-right w-[40%]">
               {shop?.phone && (
                 <a href={`tel:${shop.phone}`} className="text-black hover:underline decoration-dotted">
                   {shop.phone}
                 </a>
               )}
             </div>
          </div>

          {/* Center Column: Logo, Name, TIN */}
          <div className="flex flex-col items-center text-center">
            {business?.logo_url && (
              <img src={business.logo_url} alt="Logo" className="h-12 mb-2 object-contain" />
            )}
            <h1 className="text-xl font-bold mb-1 uppercase tracking-wider">{shop?.name || 'Bakery'}</h1>
            
            {/* 3. TIN Number */}
            {business?.metadata?.registration_number && (
              <div className="text-[10px] mb-2 font-medium">
                Tax Identification Number: {business.metadata.registration_number}
              </div>
            )}
          </div>

          {/* 5. Disclaimer */}
          <div className="text-[10px] italic border-t border-b border-black border-dotted py-1 w-full mt-1 text-center">
            Opened products cannot be refunded
          </div>
        </div>

        {/* Transaction Info */}
        <div className="border-t border-b border-dashed border-black py-2 mb-4 text-[10px]">
          {order.invoice_number ? (
             <div className="flex justify-between">
               <span>Invoice #:</span>
               <span className="font-bold">{order.invoice_number}</span>
             </div>
          ) : (
             <div className="flex justify-between">
               <span>Order #:</span>
               <span className="font-bold">{order.order_code}</span>
             </div>
          )}
          {/* Ref hidden for POS invoices */}
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          {order.customer_phone && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{order.customer_phone}</span>
            </div>
          )}
        </div>

        {/* Items List */}
        <table className="w-full mb-4 text-[10px]">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1 w-[40%]">Item</th>
              <th className="text-center py-1 w-[15%]">Qty</th>
              <th className="text-right py-1 w-[20%]">Price</th>
              <th className="text-right py-1 w-[25%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-dotted border-black">
                <td className="py-1 pr-1">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{formatCurrency(Number(item.price), currency)}</td>
                <td className="text-right py-1 font-semibold">{formatCurrency(Number(item.subtotal), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="border-t border-black pt-2 space-y-1 mb-6 text-[11px]">
          <div className="flex justify-between text-[11px]">
             <span>Subtotal:</span>
             <span>{formatCurrency(items.reduce((acc, item) => acc + Number(item.subtotal), 0), currency)}</span>
          </div>
          
          {taxBreakdown?.map((tax, i) => (
             <div key={i} className="flex justify-between text-[11px] text-black">
               <span>
                 {tax.name} ({tax.rate}%)
                 {tax.type === 'compound' ? ' (Compound)' : ''}
                 {tax.amount < 0 || tax.type === 'deducted' ? ' (Deducted)' : ''}:
               </span>
               <span>{formatCurrency(tax.amount, currency)}</span>
             </div>
          ))}

          <div className="flex justify-between font-bold text-[14px] border-t border-black pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(Number(order.total_amount), currency)}</span>
          </div>
          
          {/* 4. Payment Information Section */}
          {payment && (
            <div className="border-t border-dotted border-black mt-2 pt-2">
              {payment.splitPayments && payment.splitPayments.length > 0 ? (
                <div className="space-y-1 mb-2">
                  <div className="text-[9px] uppercase font-bold mb-1 underline">Payment Breakdown:</div>
                  {payment.splitPayments.map((p, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="capitalize">{p.method.replace('_', ' ')}:</span>
                      <span>{formatCurrency(p.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-[11px]">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(payment.amountPaid, currency)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-[11px] font-bold border-t border-dotted border-black pt-1">
                <span>Change Due:</span>
                <span>{formatCurrency(payment.change, currency)}</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between text-[10px] mt-1">
            <span>Payment Method:</span>
            <span className="capitalize">{order.payment_method?.replace('_', ' ')}</span>
          </div>

          {/* 5. Balance Case Tracking */}
          {onCreateBalanceCase && (
            <div className="mt-2 print:hidden text-center">
              <button 
                onClick={onCreateBalanceCase}
                className="bg-black text-white text-[10px] px-2 py-1 rounded hover:bg-gray-800 w-full"
              >
                Create Balance Case
              </button>
            </div>
          )}
        </div>

        {/* Footer & QR Code */}
        <div className="relative mt-8 pt-4 border-t border-dashed border-black min-h-[40mm]">
          <div className="w-[60%] text-[10px] pr-2">
            <p className="font-bold mb-1">Thank you!</p>
            <p className="mb-1">Please visit us again.</p>
            <p className="text-[8px] text-black mt-2">Powered by BakeSync</p>
          </div>
          
          <div className="absolute bottom-[10mm] right-[10mm] bg-white">
             <QRCodeSVG 
                value={qrData}
                size={60}
                level="M"
                includeMargin={false}
             />
          </div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
