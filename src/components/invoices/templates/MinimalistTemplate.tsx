import { InvoiceTemplateProps } from '../types';
import { formatCurrency } from '@/utils/currency';

export function MinimalistTemplate({ data, settings, isCompact }: InvoiceTemplateProps) {
  const { showLogo, primaryColor, showBusinessDetails, showCustomerDetails, footerText } = settings;

  if (isCompact) {
    return (
      <div className="w-full bg-white text-xs font-sans pb-4" style={{ fontFamily: settings.fontFamily }}>
        <div className="text-center mb-6 pt-2">
          {showLogo && data.businessLogo && (
            <img src={data.businessLogo} alt="Logo" className="h-10 mx-auto mb-2 object-contain grayscale opacity-80" />
          )}
          <h2 className="font-medium tracking-tight text-sm text-gray-900">{data.businessName}</h2>
        </div>

        <div className="mb-4 px-2">
           <div className="flex justify-between text-[10px] text-gray-500 mb-1">
             <span>Invoice</span>
             <span>#{data.invoiceNumber}</span>
           </div>
           <div className="flex justify-between text-[10px] text-gray-500 mb-1">
             <span>Date</span>
             <span>{new Date(data.date).toLocaleDateString()}</span>
           </div>
           <div className="flex justify-between text-[10px] text-gray-500">
             <span>Status</span>
             <span className={`uppercase font-medium ${data.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
               {data.status}
             </span>
           </div>
        </div>

        <div className="px-2 mb-4">
          {data.items.map((item, index) => (
            <div key={index} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
              <div className="flex-1 pr-2">
                <div className="text-gray-900">{item.name}</div>
                <div className="text-[10px] text-gray-500">{item.quantity} x {formatCurrency(item.price, data.currency)}</div>
              </div>
              <div className="text-gray-900">{formatCurrency(item.subtotal, data.currency)}</div>
            </div>
          ))}
        </div>

        <div className="px-2 mb-6">
          <div className="flex justify-between text-gray-500 mb-1">
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-gray-500 mb-2">
            <span>Tax</span>
            <span>{formatCurrency(data.tax, data.currency)}</span>
          </div>
          <div className="flex justify-between font-medium text-sm text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span style={{ color: primaryColor }}>{formatCurrency(data.total, data.currency)}</span>
          </div>
        </div>

        {footerText && (
          <div className="text-center text-[10px] text-gray-400 px-2">
            {footerText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-12 max-w-[210mm] mx-auto min-h-[297mm] text-sm" style={{ fontFamily: settings.fontFamily }}>
      <div className="flex justify-between items-start mb-16">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-gray-900 mb-1">INVOICE #{data.invoiceNumber}</h1>
          <p className="text-gray-500">{new Date(data.date).toLocaleDateString()}</p>
          <p className={`text-sm uppercase font-medium mt-1 ${data.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
            {data.status}
          </p>
        </div>
        {showLogo && data.businessLogo && (
          <img src={data.businessLogo} alt="Logo" className="h-12 object-contain grayscale opacity-80" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16">
        {showBusinessDetails && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">From</h3>
            <div className="space-y-1 text-gray-900">
              <p className="font-medium">{data.businessName}</p>
              <p>{data.businessAddress}</p>
              <p>{data.businessEmail}</p>
              <p>{data.businessPhone}</p>
            </div>
          </div>
        )}
        
        {showCustomerDetails && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">To</h3>
            <div className="space-y-1 text-gray-900">
              <p className="font-medium">{data.customerName}</p>
              <p>{data.customerAddress}</p>
              <p>{data.customerEmail}</p>
              <p>{data.customerPhone}</p>
            </div>
          </div>
        )}
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Item</th>
            <th className="text-center py-4 font-medium text-gray-500 text-xs uppercase tracking-wider w-24">Qty</th>
            <th className="text-right py-4 font-medium text-gray-500 text-xs uppercase tracking-wider w-32">Price</th>
            <th className="text-right py-4 font-medium text-gray-500 text-xs uppercase tracking-wider w-32">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.items.map((item, index) => (
            <tr key={index}>
              <td className="py-4 text-gray-900">{item.name}</td>
              <td className="text-center py-4 text-gray-500">{item.quantity}</td>
              <td className="text-right py-4 text-gray-500">{formatCurrency(item.price, data.currency)}</td>
              <td className="text-right py-4 text-gray-900">{formatCurrency(item.subtotal, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-16">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>{formatCurrency(data.tax, data.currency)}</span>
          </div>
          <div className="flex justify-between font-medium text-lg text-gray-900 pt-3 border-t border-gray-200">
            <span>Total</span>
            <span style={{ color: primaryColor }}>{formatCurrency(data.total, data.currency)}</span>
          </div>
        </div>
      </div>

      {footerText && (
        <div className="text-gray-400 text-xs">
          {footerText}
        </div>
      )}
    </div>
  );
}
