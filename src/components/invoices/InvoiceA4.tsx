import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  subtotal?: number;
}

interface Invoice {
  invoice_number: string;
  created_at: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  items_snapshot?: InvoiceItem[];
  shop?: {
    name: string;
    logo_url?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  customer_info?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

interface InvoiceA4Props {
  invoice: Invoice;
  size?: 'a4' | 'a5';
}

export const InvoiceA4 = forwardRef<HTMLDivElement, InvoiceA4Props>(({ invoice, size = 'a4' }, ref) => {
  if (!invoice) return null;

  const items = invoice.items_snapshot || [];
  const shop = invoice.shop || {};
  const customer = invoice.customer_info || {};

  const dimensions = size === 'a4' ? 'w-[210mm] min-h-[297mm] p-[15mm]' : 'w-[148mm] min-h-[210mm] p-[10mm] text-xs';

  return (
    <div ref={ref} className={`bg-white text-black mx-auto relative font-sans leading-normal ${dimensions}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex flex-col">
           {shop.logo_url && (
              <img src={shop.logo_url} alt={shop.name} className="h-16 w-auto object-contain mb-4" />
           )}
           <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900">{shop.name}</h1>
           <div className="mt-2 text-gray-600 space-y-1 text-xs">
             {shop.address && <p>{shop.address}</p>}
             {shop.city && <p>{shop.city}, {shop.country}</p>}
             {shop.phone && <p>Tel: {shop.phone}</p>}
             {shop.email && <p>Email: {shop.email}</p>}
           </div>
        </div>

        <div className="text-right">
          <h2 className="text-4xl font-light text-gray-300 uppercase tracking-widest mb-4">Invoice</h2>
          <div className="space-y-2">
            <div className="flex justify-between w-64 ml-auto border-b border-gray-100 pb-1">
              <span className="text-gray-500 font-medium">Invoice No:</span>
              <span className="font-bold">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between w-64 ml-auto border-b border-gray-100 pb-1">
              <span className="text-gray-500 font-medium">Date:</span>
              <span>{format(new Date(invoice.created_at), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between w-64 ml-auto border-b border-gray-100 pb-1">
              <span className="text-gray-500 font-medium">Status:</span>
              <span className="uppercase font-semibold">{invoice.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-12 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Bill To</h3>
        <div className="font-medium text-lg text-gray-900">{customer.name || 'Guest Customer'}</div>
        {customer.phone && <div className="text-gray-600 mt-1">{customer.phone}</div>}
        {customer.email && <div className="text-gray-600 mt-1">{customer.email}</div>}
        {customer.address && <div className="text-gray-600 mt-1">{customer.address}</div>}
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-3 font-bold uppercase text-xs tracking-wider">Item Description</th>
            <th className="text-center py-3 font-bold uppercase text-xs tracking-wider w-24">Qty</th>
            <th className="text-right py-3 font-bold uppercase text-xs tracking-wider w-32">Unit Price</th>
            <th className="text-right py-3 font-bold uppercase text-xs tracking-wider w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: InvoiceItem, index: number) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-4">
                <div className="font-medium text-gray-900">{item.name}</div>
              </td>
              <td className="text-center py-4 text-gray-600">{item.quantity}</td>
              <td className="text-right py-4 text-gray-600">{Number(item.price).toLocaleString()}</td>
              <td className="text-right py-4 font-medium text-gray-900">
                {(item.subtotal || (item.price * item.quantity)).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-80 space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{Number(invoice.subtotal).toLocaleString()} RWF</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (18%)</span>
            <span>{Number(invoice.tax_amount).toLocaleString()} RWF</span>
          </div>
          <div className="border-t-2 border-gray-800 pt-3 flex justify-between items-end">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-2xl">{Number(invoice.total_amount).toLocaleString()} RWF</span>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="mt-auto pt-8 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-8 text-xs text-gray-500">
          <div>
            <h4 className="font-bold text-gray-900 uppercase mb-2">Terms & Conditions</h4>
            <p>Payment is due upon receipt.</p>
            <p>Please include invoice number on your check.</p>
          </div>
          <div className="text-right">
             <p className="italic">Thank you for your business!</p>
             <p className="mt-2">Generated by BakeSync POS</p>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceA4.displayName = 'InvoiceA4';
