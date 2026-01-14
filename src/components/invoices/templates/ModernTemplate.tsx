import { InvoiceTemplateProps } from '../types';
import { formatCurrency } from '@/utils/currency';

export function ModernTemplate({ data, settings, isCompact }: InvoiceTemplateProps) {
  const { showLogo, logoPosition, primaryColor, secondaryColor, showBusinessDetails, showCustomerDetails, footerText } = settings;
  if (isCompact) {
    return (
      <div className="w-full bg-white text-xs font-sans pb-4" style={{ fontFamily: settings.fontFamily }}>
        <div className="h-2 w-full mb-4" style={{ backgroundColor: primaryColor }} />
        
        <div className="px-2">
          <div className="text-center mb-6">
            {showLogo && data.businessLogo && (
              <img src={data.businessLogo} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
            )}
            <h2 className="font-bold text-sm text-gray-900">{data.businessName}</h2>
          </div>

          <div className="bg-gray-50 p-2 rounded mb-4 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice</span>
              <span className="font-medium">#{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{new Date(data.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span>
              <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${data.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {data.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {data.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0">
                <div className="flex-1 pr-2">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-gray-500 text-[10px]">{item.quantity} x {formatCurrency(item.price, data.currency)}</div>
                </div>
                <div className="font-bold text-gray-900">{formatCurrency(item.subtotal, data.currency)}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-1 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(data.subtotal, data.currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(data.tax, data.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-200" style={{ color: primaryColor }}>
              <span>Total</span>
              <span>{formatCurrency(data.total, data.currency)}</span>
            </div>
          </div>

          {footerText && (
            <div className="text-center text-[10px] text-gray-400">
              {footerText}
            </div>
          )}
        </div>
        
        <div className="h-1 w-full mt-4" style={{ backgroundColor: secondaryColor }} />
      </div>
    );
  }

  return (
    <div className="w-full bg-white max-w-[210mm] mx-auto min-h-[297mm] text-sm font-sans" style={{ fontFamily: settings.fontFamily }}>
      {/* Header Bar */}
      <div className="h-4 w-full" style={{ backgroundColor: primaryColor }} />
      
      <div className="p-8">
        <div className="flex justify-between items-start mb-12">
          <div>
            {showLogo && data.businessLogo && (
              <img src={data.businessLogo} alt="Logo" className="h-16 object-contain mb-4" />
            )}
            {showBusinessDetails && (
              <div className="text-gray-600">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{data.businessName}</h2>
                <p>{data.businessAddress}</p>
                <p>{data.businessEmail}</p>
                <p>{data.businessPhone}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">INVOICE</h1>
            <p className="text-gray-500 font-medium">#{data.invoiceNumber}</p>
            <div className="mt-4 space-y-1 text-gray-600">
              <p>Date: <span className="font-medium text-gray-900">{new Date(data.date).toLocaleDateString()}</span></p>
              {data.dueDate && <p>Due: <span className="font-medium text-gray-900">{new Date(data.dueDate).toLocaleDateString()}</span></p>}
              <div className="flex justify-end items-center mt-2">
                <span className={`font-bold uppercase px-2 py-0.5 rounded text-xs ${data.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showCustomerDetails && (
          <div className="bg-gray-50 p-6 rounded-lg mb-8 border-l-4" style={{ borderLeftColor: primaryColor }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Bill To</h3>
            <p className="text-lg font-bold text-gray-900">{data.customerName}</p>
            <p className="text-gray-600">{data.customerAddress}</p>
            <p className="text-gray-600">{data.customerEmail}</p>
            <p className="text-gray-600">{data.customerPhone}</p>
          </div>
        )}

        {/* Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="text-white" style={{ backgroundColor: secondaryColor }}>
              <th className="text-left py-3 px-4 font-semibold rounded-l-lg">Item</th>
              <th className="text-center py-3 px-4 font-semibold w-24">Qty</th>
              <th className="text-right py-3 px-4 font-semibold w-32">Price</th>
              <th className="text-right py-3 px-4 font-semibold w-32 rounded-r-lg">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">{item.name}</p>
                </td>
                <td className="text-center py-4 px-4 text-gray-600">{item.quantity}</td>
                <td className="text-right py-4 px-4 text-gray-600">{formatCurrency(item.price, data.currency)}</td>
                <td className="text-right py-4 px-4 font-medium text-gray-900">{formatCurrency(item.subtotal, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-full md:w-72 bg-gray-50 p-6 rounded-lg space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(data.subtotal, data.currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(data.tax, data.currency)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-200" style={{ color: primaryColor }}>
              <span>Total</span>
              <span>{formatCurrency(data.total, data.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {footerText && (
          <div className="text-center text-gray-500 text-sm mt-auto pt-8 border-t border-gray-100">
            {footerText}
          </div>
        )}
      </div>
      
      <div className="h-2 w-full mt-auto" style={{ backgroundColor: secondaryColor }} />
    </div>
  );
}
