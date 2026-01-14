import { InvoiceTemplateProps } from '../types';
import { formatCurrency } from '@/utils/currency';

export function ProfessionalTemplate({ data, settings, isCompact }: InvoiceTemplateProps) {
  const { showLogo, primaryColor, showBusinessDetails, showCustomerDetails, footerText } = settings;

  if (isCompact) {
    return (
      <div className="w-full bg-white text-xs font-serif pb-4" style={{ fontFamily: settings.fontFamily }}>
        <div className="border-b-2 border-gray-800 pb-4 mb-4 text-center pt-2">
           {showLogo && data.businessLogo ? (
             <img src={data.businessLogo} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
           ) : (
             <h2 className="text-lg font-bold text-gray-900">{data.businessName}</h2>
           )}
           <div className="text-[10px] text-gray-600 mt-1">
             <p className="font-bold">INV: {data.invoiceNumber}</p>
             <p>{new Date(data.date).toLocaleDateString()}</p>
           </div>
        </div>
<<<<<<< HEAD

=======
{/* invoice */}
>>>>>>> development
        <div className="px-2 mb-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-1 font-bold text-[10px]">Item</th>
                <th className="text-right py-1 font-bold text-[10px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-2">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-[10px] text-gray-600">{item.quantity} x {formatCurrency(item.price, data.currency)}</div>
                  </td>
                  <td className="text-right py-2 align-top font-semibold">{formatCurrency(item.subtotal, data.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-2 mb-6">
          <div className="border-t-2 border-gray-200 pt-2">
             <div className="flex justify-between text-[10px] text-gray-600 mb-1">
               <span>Subtotal:</span>
               <span>{formatCurrency(data.subtotal, data.currency)}</span>
             </div>
             <div className="flex justify-between text-[10px] text-gray-600 mb-1">
               <span>Tax:</span>
               <span>{formatCurrency(data.tax, data.currency)}</span>
             </div>
             <div className="flex justify-between font-bold text-sm mt-2 pt-1 border-t border-gray-800" style={{ color: primaryColor }}>
               <span>Total:</span>
               <span>{formatCurrency(data.total, data.currency)}</span>
             </div>
          </div>
        </div>

        {footerText && (
          <div className="text-center italic text-[10px] text-gray-600 px-2 border-t border-gray-200 pt-2">
            {footerText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-10 max-w-[210mm] mx-auto min-h-[297mm] text-sm" style={{ fontFamily: settings.fontFamily }}>
      <div className="border-2 border-gray-800 p-8 h-full min-h-[270mm]">
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-8">
          <div>
             {showLogo && data.businessLogo ? (
               <img src={data.businessLogo} alt="Logo" className="h-20 object-contain mb-4" />
             ) : (
               <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">{data.businessName}</h1>
             )}
             <div className="text-gray-600 font-serif">
               <p className="font-bold">Invoice #: {data.invoiceNumber}</p>
               <p>Date: {new Date(data.date).toLocaleDateString()}</p>
             </div>
             <div className="mt-4">
               <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Status</p>
               <p className={`font-bold uppercase ${data.status === 'paid' ? 'text-green-700' : 'text-red-700'}`}>
                 {data.status}
               </p>
             </div>
          </div>
          <div className="text-right">
             <h1 className="text-4xl font-serif font-bold text-gray-900 uppercase tracking-widest" style={{ color: primaryColor }}>Invoice</h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mb-8">
           {showBusinessDetails && (
             <div className="flex-1 border border-gray-300 p-4 bg-gray-50">
               <h3 className="font-bold font-serif text-gray-900 mb-2 uppercase text-xs tracking-wider">From:</h3>
               <div className="space-y-1 text-gray-700">
                 <p className="font-semibold">{data.businessName}</p>
                 <p>{data.businessAddress}</p>
                 <p>{data.businessEmail}</p>
                 <p>{data.businessPhone}</p>
               </div>
             </div>
           )}
           {showCustomerDetails && (
             <div className="flex-1 border border-gray-300 p-4 bg-gray-50">
               <h3 className="font-bold font-serif text-gray-900 mb-2 uppercase text-xs tracking-wider">Bill To:</h3>
               <div className="space-y-1 text-gray-700">
                 <p className="font-semibold">{data.customerName}</p>
                 <p>{data.customerAddress}</p>
                 <p>{data.customerEmail}</p>
                 <p>{data.customerPhone}</p>
               </div>
             </div>
           )}
        </div>

        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left py-3 px-4 font-serif font-bold border border-gray-800">Item Description</th>
              <th className="text-center py-3 px-4 font-serif font-bold w-24 border border-gray-800">Qty</th>
              <th className="text-right py-3 px-4 font-serif font-bold w-32 border border-gray-800">Price</th>
              <th className="text-right py-3 px-4 font-serif font-bold w-32 border border-gray-800">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="py-3 px-4 border border-gray-300 text-gray-900">{item.name}</td>
                <td className="text-center py-3 px-4 border border-gray-300 text-gray-700">{item.quantity}</td>
                <td className="text-right py-3 px-4 border border-gray-300 text-gray-700">{formatCurrency(item.price, data.currency)}</td>
                <td className="text-right py-3 px-4 border border-gray-300 font-semibold text-gray-900">{formatCurrency(item.subtotal, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-12">
           <div className="w-1/2">
             <table className="w-full">
               <tbody>
                 <tr>
                   <td className="py-2 px-4 text-right text-gray-600 font-serif">Subtotal:</td>
                   <td className="py-2 px-4 text-right font-semibold border-b border-gray-300">{formatCurrency(data.subtotal, data.currency)}</td>
                 </tr>
                 <tr>
                   <td className="py-2 px-4 text-right text-gray-600 font-serif">Tax:</td>
                   <td className="py-2 px-4 text-right font-semibold border-b border-gray-300">{formatCurrency(data.tax, data.currency)}</td>
                 </tr>
                 <tr className="bg-gray-100">
                   <td className="py-3 px-4 text-right font-bold font-serif text-lg" style={{ color: primaryColor }}>Total:</td>
                   <td className="py-3 px-4 text-right font-bold font-serif text-lg">{formatCurrency(data.total, data.currency)}</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>

        {footerText && (
          <div className="mt-auto pt-8 border-t-2 border-gray-200 text-center font-serif italic text-gray-600">
            {footerText}
          </div>
        )}
      </div>
    </div>
  );
}
