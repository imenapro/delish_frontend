import { InvoiceTemplateProps } from '../types';
import { formatCurrency } from '@/utils/currency';

export function ClassicTemplate({ data, settings, isCompact }: InvoiceTemplateProps) {
  const { showLogo, logoPosition, primaryColor, showBusinessDetails, showCustomerDetails, showPaymentTerms, footerText } = settings;
  const logoAlignment = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }[logoPosition];

  if (isCompact) {
    return (
      <div className="w-full bg-white p-2 text-xs font-mono" style={{ fontFamily: settings.fontFamily }}>
        <div className="text-center mb-4">
          {showLogo && data.businessLogo && (
            <img src={data.businessLogo} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
          )}
          <h2 className="font-bold text-sm uppercase tracking-wide">{data.businessName}</h2>
          {showBusinessDetails && (
            <div className="text-gray-600 text-[10px]">
               <p>{data.businessAddress}</p>
               <p>{data.businessPhone}</p>
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-gray-300 mb-2 pb-2 text-[10px]">
          <div className="flex justify-between">
            <span>Invoice:</span>
            <span>{data.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(data.date).toLocaleDateString()}</span>
          </div>
          {showCustomerDetails && (
             <div className="mt-1 pt-1 border-t border-dotted border-gray-200">
               <span className="block font-bold">To:</span>
               <span>{data.customerName}</span>
             </div>
          )}
        </div>

        <div className="mb-4">
          {data.items.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="font-bold">{item.name}</div>
              <div className="flex justify-between text-gray-600">
                <span>{item.quantity} x {formatCurrency(item.price, data.currency)}</span>
                <span className="font-medium text-black">{formatCurrency(item.subtotal, data.currency)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 mb-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(data.tax, data.currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1">
            <span>Total</span>
            <span>{formatCurrency(data.total, data.currency)}</span>
          </div>
        </div>

        {showPaymentTerms && footerText && (
          <div className="text-center text-[10px] text-gray-500 italic">
            {footerText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] text-sm" style={{ fontFamily: settings.fontFamily }}>
      {/* Header */}
      <div className={`flex ${logoPosition === 'center' ? 'flex-col items-center' : 'justify-between'} mb-8`}>
        {showLogo && data.businessLogo && (
          <div className={`flex ${logoAlignment} w-full mb-4`}>
            <img src={data.businessLogo} alt="Logo" className="h-20 object-contain" />
          </div>
        )}
        <div className={logoPosition === 'center' ? 'text-center w-full' : ''}>
          <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wide">Invoice</h1>
          <div className="mt-2 text-gray-600">
            <p>#{data.invoiceNumber}</p>
            <p>Date: {new Date(data.date).toLocaleDateString()}</p>
            {data.dueDate && <p>Due Date: {new Date(data.dueDate).toLocaleDateString()}</p>}
            <p className="font-bold uppercase mt-1" style={{ color: data.status === 'paid' ? '#16a34a' : '#dc2626' }}>
              {data.status}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between mb-8 gap-8">
        {/* Business Info */}
        {showBusinessDetails && (
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-2 border-b pb-1" style={{ borderColor: primaryColor }}>From</h3>
            <div className="text-gray-600">
              <p className="font-medium text-gray-900">{data.businessName}</p>
              {data.businessAddress && <p className="whitespace-pre-line">{data.businessAddress}</p>}
              {data.businessPhone && <p>Tel: {data.businessPhone}</p>}
              {data.businessEmail && <p>{data.businessEmail}</p>}
            </div>
          </div>
        )}

        {/* Customer Info */}
        {showCustomerDetails && (
          <div className="flex-1 text-right">
            <h3 className="font-bold text-gray-900 mb-2 border-b pb-1" style={{ borderColor: primaryColor }}>To</h3>
            <div className="text-gray-600">
              <p className="font-medium text-gray-900">{data.customerName}</p>
              {data.customerAddress && <p className="whitespace-pre-line">{data.customerAddress}</p>}
              {data.customerPhone && <p>Tel: {data.customerPhone}</p>}
              {data.customerEmail && <p>{data.customerEmail}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2" style={{ borderColor: primaryColor }}>
            <th className="text-left py-2 font-bold text-gray-900">Description</th>
            <th className="text-center py-2 font-bold text-gray-900 w-24">Qty</th>
            <th className="text-right py-2 font-bold text-gray-900 w-32">Price</th>
            <th className="text-right py-2 font-bold text-gray-900 w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-3">
                <p className="font-medium text-gray-900">{item.name}</p>
              </td>
              <td className="text-center py-3 text-gray-600">{item.quantity}</td>
              <td className="text-right py-3 text-gray-600">{formatCurrency(item.price, data.currency)}</td>
              <td className="text-right py-3 font-medium text-gray-900">{formatCurrency(item.subtotal, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>{formatCurrency(data.tax, data.currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2" style={{ borderColor: primaryColor, color: primaryColor }}>
            <span>Total</span>
            <span>{formatCurrency(data.total, data.currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes & Footer */}
      {(data.notes || (showPaymentTerms && footerText)) && (
        <div className="border-t pt-8 text-gray-600 text-sm">
          {data.notes && (
            <div className="mb-4">
              <h4 className="font-bold mb-1">Notes:</h4>
              <p>{data.notes}</p>
            </div>
          )}
          {showPaymentTerms && footerText && (
            <div className="text-center mt-8 text-gray-500 italic">
              {footerText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
