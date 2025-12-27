import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  subtotal?: number;
}

interface Invoice {
  shop?: {
    name?: string;
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
  };
  items_snapshot?: InvoiceItem[];
  invoice_number?: string;
  created_at: string;
  status?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
}

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const shop = invoice.shop || {};
  const customer = invoice.customer_info || {};
  const items = invoice.items_snapshot || [];

  // Colors
  const primaryColor = [20, 20, 20]; // Dark gray/Black
  const secondaryColor = [100, 100, 100]; // Gray
  const accentColor = [240, 240, 240]; // Light gray background

  // Header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(shop.name || 'Shop Name', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  let yPos = 26;
  if (shop.address) {
    doc.text(shop.address, 14, yPos);
    yPos += 5;
  }
  if (shop.city || shop.country) {
    doc.text(`${shop.city || ''} ${shop.country || ''}`.trim(), 14, yPos);
    yPos += 5;
  }
  if (shop.phone) {
    doc.text(`Tel: ${shop.phone}`, 14, yPos);
    yPos += 5;
  }
  if (shop.email) {
    doc.text(`Email: ${shop.email}`, 14, yPos);
  }

  // Invoice Details (Right aligned)
  doc.setFontSize(20);
  doc.setTextColor(200, 200, 200);
  doc.text('INVOICE', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  const rightColX = 140;
  let rightY = 30;

  doc.text('Invoice No:', rightColX, rightY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(invoice.invoice_number || '-', 196, rightY, { align: 'right' });
  rightY += 6;

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Date:', rightColX, rightY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(format(new Date(invoice.created_at), 'dd/MM/yyyy'), 196, rightY, { align: 'right' });
  rightY += 6;

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Status:', rightColX, rightY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text((invoice.status || 'PAID').toUpperCase(), 196, rightY, { align: 'right' });

  // Bill To Section
  const billToY = Math.max(yPos + 15, rightY + 15);
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(14, billToY, 182, 35, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('BILL TO', 20, billToY + 8);

  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(customer.name || 'Guest Customer', 20, billToY + 16);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  let custY = billToY + 22;
  if (customer.phone) {
    doc.text(customer.phone, 20, custY);
    custY += 5;
  }
  if (customer.email) {
    doc.text(customer.email, 20, custY);
    custY += 5;
  }

  // Items Table
  const tableY = billToY + 40;
  
  const tableData = items.map((item) => [
    item.name,
    item.quantity,
    Number(item.price).toLocaleString(),
    (item.subtotal || (item.price * item.quantity)).toLocaleString()
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: { bottom: 0.5 },
      lineColor: [0, 0, 0]
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Description
      1: { cellWidth: 20, halign: 'center' }, // Qty
      2: { cellWidth: 35, halign: 'right' }, // Price
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } // Total
    },
    didDrawPage: (data) => {
      // Footer can go here
    }
  });

  // Totals
  const finalY = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
  
  const subtotal = Number(invoice.subtotal || 0).toLocaleString();
  const tax = Number(invoice.tax_amount || 0).toLocaleString();
  const total = Number(invoice.total_amount || 0).toLocaleString();

  const totalsX = 120;
  let currentY = finalY;

  // Subtotal
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Subtotal:', totalsX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${subtotal} RWF`, 196, currentY, { align: 'right' });
  currentY += 7;

  // Tax
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Tax (18%):', totalsX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${tax} RWF`, 196, currentY, { align: 'right' });
  currentY += 7;

  // Total Line
  doc.setDrawColor(0, 0, 0);
  doc.line(totalsX, currentY, 196, currentY);
  currentY += 7;

  // Total Amount
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX, currentY);
  doc.text(`${total} RWF`, 196, currentY, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });

  return doc;
};
