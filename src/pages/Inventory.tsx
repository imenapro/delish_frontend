import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ArrowLeftRight, History, Download, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockTransferDialog } from '@/components/inventory/StockTransferDialog';
import { InventoryTransactionDialog } from '@/components/inventory/InventoryTransactionDialog';
import { format } from 'date-fns';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export default function Inventory() {
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['shop-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .select(`
          *,
          product:products(name, category, is_active),
          shop:shops(name)
        `)
        .order('stock', { ascending: true });
      
      if (error) throw error;
      
      // Filter out items where product is null or inactive
      return (data || []).filter(item => item.product && item.product.is_active !== false);
    },
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          product:products(name),
          from_shop:shops!stock_transfers_from_shop_id_fkey(name),
          to_shop:shops!stock_transfers_to_shop_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:products(name),
          shop:shops!inventory_transactions_shop_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-primary text-primary-foreground',
      in_transit: 'bg-accent text-accent-foreground',
      completed: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  const stockRef = useRef<HTMLDivElement>(null);
  const transfersRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const handlePrintStock = useReactToPrint({
    contentRef: stockRef,
    documentTitle: 'Inventory-Stock',
  });

  const handlePrintTransfers = useReactToPrint({
    contentRef: transfersRef,
    documentTitle: 'Inventory-Transfers',
  });

  const handlePrintHistory = useReactToPrint({
    contentRef: historyRef,
    documentTitle: 'Inventory-History',
  });

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportStock = () => {
    if (!inventory) return;
    const headers = ['Product', 'Category', 'Shop', 'Stock', 'Quota'];
    const csvContent = [
      headers.join(','),
      ...inventory.map(item => [
        `"${item.product?.name}"`,
        `"${item.product?.category}"`,
        `"${item.shop?.name}"`,
        item.stock,
        item.quota_per_day
      ].join(','))
    ].join('\n');
    downloadCsv(csvContent, 'inventory_stock.csv');
  };

  const handleExportTransfers = () => {
    if (!transfers) return;
    const headers = ['Date', 'Product', 'From', 'To', 'Quantity', 'Status'];
    const csvContent = [
      headers.join(','),
      ...transfers.map(item => [
        format(new Date(item.created_at), 'yyyy-MM-dd HH:mm'),
        `"${item.product?.name}"`,
        `"${item.from_shop?.name}"`,
        `"${item.to_shop?.name}"`,
        item.quantity,
        item.status
      ].join(','))
    ].join('\n');
    downloadCsv(csvContent, 'inventory_transfers.csv');
  };

  const handleExportHistory = () => {
    if (!transactions) return;
    const headers = ['Date', 'Product', 'Type', 'Shop', 'Quantity'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(item => [
        format(new Date(item.created_at), 'yyyy-MM-dd HH:mm'),
        `"${item.product?.name}"`,
        item.transaction_type,
        `"${item.shop?.name}"`,
        item.quantity
      ].join(','))
    ].join('\n');
    downloadCsv(csvContent, 'inventory_history.csv');
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'branch_manager', 'store_keeper']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Package className="h-8 w-8" />
                Inventory Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Track stock levels, transfers, and transactions
              </p>
            </div>
            <div className="flex gap-2">
              <StockTransferDialog />
              <InventoryTransactionDialog />
            </div>
          </div>

          <Tabs defaultValue="stock" className="space-y-6">
            <TabsList>
              <TabsTrigger value="stock">Current Stock</TabsTrigger>
              <TabsTrigger value="transfers">Transfers</TabsTrigger>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="space-y-4">
              <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrintStock}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportStock}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <div ref={stockRef}>
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : inventory && inventory.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {inventory.map((item) => (
                    <Card key={item.id} className="shadow-[var(--shadow-medium)]">
                      <CardHeader>
                        <CardTitle className="text-lg">{item.product?.name}</CardTitle>
                        <CardDescription>{item.shop?.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Current Stock</span>
                            <Badge variant={item.stock < 10 ? 'destructive' : 'default'}>
                              {item.stock} units
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Daily Quota</span>
                            <span className="font-medium">{item.quota_per_day}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No inventory data</p>
                  </CardContent>
                </Card>
              )}
              </div>
            </TabsContent>

            <TabsContent value="transfers" className="space-y-4">
              <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrintTransfers}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportTransfers}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <div ref={transfersRef}>
              {transfersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : transfers && transfers.length > 0 ? (
                <div className="space-y-4">
                  {transfers.map((transfer) => (
                    <Card key={transfer.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{transfer.product?.name}</span>
                            <Badge className={getStatusColor(transfer.status)}>
                              {transfer.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            From: {transfer.from_shop?.name} → To: {transfer.to_shop?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {transfer.quantity} units
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transfer.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No transfer requests</p>
                  </CardContent>
                </Card>
              )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrintHistory}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportHistory}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <div ref={historyRef}>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <Card key={transaction.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <History className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{transaction.product?.name}</span>
                            <Badge>{transaction.transaction_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Shop: {transaction.shop?.name}
                          </p>
                          <p className="text-sm">
                            Quantity: {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} units
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No transaction history</p>
                  </CardContent>
                </Card>
              )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
