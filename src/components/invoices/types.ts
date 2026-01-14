import { InvoiceSettings } from '@/contexts/StoreContext';

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// invoice
export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  status: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLogo?: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  currency: string;
  paymentMethod?: string;
}

export interface InvoiceTemplateProps {
  data: InvoiceData;
  settings: InvoiceSettings;
  isCompact?: boolean; // For thermal printers or small screens
}
