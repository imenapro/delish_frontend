import { InvoiceTemplateProps } from '../types';
import { formatCurrency } from '@/utils/currency';

export function BoldTemplate({ data, settings, isCompact }: InvoiceTemplateProps) {
  const { showLogo, primaryColor, secondaryColor, showBusinessDetails, showCustomerDetails, footerText } = settings;
<<<<<<< HEAD

=======
// invoice
>>>>>>> development
  if (isCompact) {
    return (
      <div className="w-full bg-white text-xs font-bold pb-4" style={{ fontFamily: settings.fontFamily }}>
        <div className="bg-gray-900 text-white p-4 text-center mb-4">
          {showLogo && data.businessLogo && (
            <div className="bg-white p-1 rounded inline-block mb-2">
               <img src={data.businessLogo} alt="Logo" className="h-8 object-contain" />
            </div>
          )}
          <h2 className="text-lg font-black tracking-tighter" style={{ color: primaryColor }}>INVOICE</h2>
          <p className="text-[10px] text-gray-400">#{data.invoiceNumber}</p>
        </div>

        <div className="px-2 mb-4">
          <h3 className="text-[10px] uppercase border-b-2 mb-2 pb-1" style={{ borderColor: primaryColor }}>{data.businessName}</h3>
          <div className="text-[10px] font-normal text-gray-600">
             <p>{new Date(data.date).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="px-2 mb-4 space-y-2">
          {data.items.map((item, index) => (
            <div key={index} className="bg-gray-100 p-2 rounded">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-gray-900">{item.name}</span>
                <span className="font-bold">{formatCurrency(item.subtotal, data.currency)}</span>
              </div>
              <div className="text-[10px] font-normal text-gray-500">
                {item.quantity} x {formatCurrency(item.price, data.currency)}
              </div>
            </div>
          ))}
        </div>

        <div className="px-2 flex justify-end mb-4">
          <div className="w-full bg-gray-900 text-white p-3 rounded-lg">
             <div className="flex justify-between mb-1 opacity-70 font-normal text-[10px]">
               <span>Subtotal</span>
               <span>{formatCurrency(data.subtotal, data.currency)}</span>
             </div>
             <div className="flex justify-between mb-2 opacity-70 font-normal text-[10px]">
               <span>Tax</span>
               <span>{formatCurrency(data.tax, data.currency)}</span>
             </div>
             <div className="flex justify-between text-sm font-black pt-2 border-t border-gray-700" style={{ color: primaryColor }}>
               <span>TOTAL</span>
               <span>{formatCurrency(data.total, data.currency)}</span>
             </div>
             {data.paymentMethod && (
               <div className="flex justify-between opacity-70 font-normal text-[10px] pt-1">
                 <span>Payment</span>
                 <span className="capitalize">{data.paymentMethod.replace('_', ' ')}</span>
               </div>
             )}
          </div>
        </div>

        {footerText && (
          <div className="text-center font-normal text-gray-400 text-[10px] px-2">
            {footerText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white max-w-[210mm] mx-auto min-h-[297mm] text-sm font-bold" style={{ fontFamily: settings.fontFamily }}>
      <div className="flex bg-gray-900 text-white p-12 justify-between items-center">
        <div>
          <h1 className="text-5xl font-black tracking-tighter mb-2" style={{ color: primaryColor }}>INVOICE</h1>
          <p className="text-gray-400 mb-6">#{data.invoiceNumber}</p>
          <div className="flex gap-8">
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Date</div>
              <div>{new Date(data.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Status</div>
              <div className={`uppercase ${data.status === 'paid' ? 'text-green-400' : 'text-red-400'}`}>
                {data.status}
              </div>
            </div>
          </div>
        </div>
        {showLogo && data.businessLogo && (
          <div className="bg-white p-2 rounded">
             <img src={data.businessLogo} alt="Logo" className="h-16 object-contain" />
          </div>
        )}
      </div>

      <div className="p-12">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-12">
          {showBusinessDetails && (
            <div className="flex-1">
              <h3 className="text-black uppercase text-xs mb-4 pb-2 border-b-4" style={{ borderColor: primaryColor }}>From</h3>
              <div className="font-normal text-gray-600">
                <p className="font-bold text-gray-900">{data.businessName}</p>
                <p>{data.businessAddress}</p>
                <p>{data.businessEmail}</p>
                <p>{data.businessPhone}</p>
              </div>
            </div>
          )}
          
          {showCustomerDetails && (
            <div className="flex-1">
              <h3 className="text-black uppercase text-xs mb-4 pb-2 border-b-4" style={{ borderColor: secondaryColor }}>Bill To</h3>
              <div className="font-normal text-gray-600">
                <p className="font-bold text-gray-900">{data.customerName}</p>
                <p>{data.customerAddress}</p>
                <p>{data.customerEmail}</p>
                <p>{data.customerPhone}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-12">
           <div className="grid grid-cols-12 gap-4 bg-gray-100 p-4 rounded-lg mb-4 text-xs uppercase tracking-wider text-gray-500">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
           </div>
           <div className="space-y-4">
             {data.items.map((item, index) => (
               <div key={index} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center">
                 <div className="col-span-6 font-bold text-gray-900">{item.name}</div>
                 <div className="col-span-2 text-center text-gray-500 font-normal">{item.quantity}</div>
                 <div className="col-span-2 text-right text-gray-500 font-normal">{formatCurrency(item.price, data.currency)}</div>
                 <div className="col-span-2 text-right font-bold text-gray-900">{formatCurrency(item.subtotal, data.currency)}</div>
               </div>
             ))}
           </div>
        </div>

        <div className="flex justify-end mb-12">
          <div className="w-1/3 bg-gray-900 text-white p-6 rounded-xl">
             <div className="flex justify-between mb-2 opacity-70 font-normal">
               <span>Subtotal</span>
               <span>{formatCurrency(data.subtotal, data.currency)}</span>
             </div>
             <div className="flex justify-between mb-4 opacity-70 font-normal">
               <span>Tax</span>
               <span>{formatCurrency(data.tax, data.currency)}</span>
             </div>
             <div className="flex justify-between text-2xl font-black pt-4 border-t border-gray-700" style={{ color: primaryColor }}>
               <span>TOTAL</span>
               <span>{formatCurrency(data.total, data.currency)}</span>
             </div>
          </div>
        </div>

        {footerText && (
          <div className="text-center font-normal text-gray-400 text-sm">
            {footerText}
          </div>
        )}
      </div>
    </div>
  );
}
