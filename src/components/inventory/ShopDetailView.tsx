
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Download, Search, Filter, ArrowUpDown, 
  AlertTriangle, CheckCircle2, XCircle, Clock, Package, TrendingDown,
  MapPin, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TenantInventoryTransactionDialog } from './TenantInventoryTransactionDialog';
import { Plus, Minus } from 'lucide-react';

interface ShopDetailViewProps {
  shop: any;
  inventory: any[];
  transfers: any[];
  transactions: any[];
  onBack: () => void;
  updateTransferMutation: any;
}

const LOW_STOCK_THRESHOLD = 10;

export function ShopDetailView({ 
  shop, 
  inventory, 
  transfers, 
  transactions, 
  onBack,
  updateTransferMutation 
}: ShopDetailViewProps) {
  if (!shop) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and Sort Inventory
  // Deduplicate inventory items by product_id to prevent display issues
  const uniqueInventory = inventory?.reduce((acc: any[], current) => {
    if (!current.product_id) return acc;
    const exists = acc.find(item => item.product_id === current.product_id);
    if (!exists) {
      return acc.concat([current]);
    }
    return acc;
  }, []) || [];

  const filteredInventory = uniqueInventory.filter((item) =>
    item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = (a.product?.name || '').localeCompare(b.product?.name || '');
    } else if (sortBy === 'category') {
      comparison = (a.product?.category || '').localeCompare(b.product?.category || '');
    } else if (sortBy === 'stock') {
      comparison = (a.stock || 0) - (b.stock || 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleExport = () => {
    const headers = ['Product', 'Category', 'Stock', 'Price', 'Status'];
    const csvContent = [
      headers.join(','),
      ...sortedInventory.map(item => [
        `"${item.product?.name}"`,
        `"${item.product?.category}"`,
        item.stock,
        item.price,
        item.stock === 0 ? 'Out of Stock' : item.stock <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'In Stock'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${shop.name}_inventory_report.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="cursor-pointer hover:text-foreground" onClick={onBack}>Shops</span>
            <span>&gt;</span>
            <span className="font-medium text-foreground">{shop.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{shop.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{shop.address || 'No address provided'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">Products in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {inventory.filter(i => i.stock > 0 && i.stock <= LOW_STOCK_THRESHOLD).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {inventory.filter(i => i.stock === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory List</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="stock">Stock Level</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.product?.image_url && (
                              <img 
                                src={item.product.image_url} 
                                alt={item.product.name} 
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">{item.product?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.product?.category}</TableCell>
                        <TableCell className="text-right">{item.price?.toLocaleString()} RWF</TableCell>
                        <TableCell className="text-right font-medium">{item.stock}</TableCell>
                        <TableCell>
                          {item.stock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : item.stock <= LOW_STOCK_THRESHOLD ? (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TenantInventoryTransactionDialog
                              businessId={shop.business_id}
                              type="in"
                              initialShopId={shop.id}
                              initialProductId={item.product_id}
                              trigger={
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-3 border-green-500/50 hover:bg-green-500/10 hover:text-green-600 text-green-600 font-medium transition-colors"
                                  aria-label="Stock In"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                                  Stock In
                                </Button>
                              }
                            />
                            <TenantInventoryTransactionDialog
                              businessId={shop.business_id}
                              type="out"
                              initialShopId={shop.id}
                              initialProductId={item.product_id}
                              trigger={
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-3 border-red-500/50 hover:bg-red-500/10 hover:text-red-600 text-red-600 font-medium transition-colors"
                                  aria-label="Stock Out"
                                >
                                  <Minus className="h-3.5 w-3.5 mr-1.5" />
                                  Stock Out
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transfers</CardTitle>
              <CardDescription>Transfers involving this shop</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transfers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>{format(new Date(transfer.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{transfer.product?.name}</TableCell>
                        <TableCell>{transfer.from_shop?.name}</TableCell>
                        <TableCell>{transfer.to_shop?.name}</TableCell>
                        <TableCell className="text-right">{transfer.quantity}</TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell>
                          {transfer.status === 'pending' && transfer.to_shop_id === shop.id && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (updateTransferMutation.isPending) return;
                                  updateTransferMutation.mutate({ transferId: transfer.id, status: 'approved' });
                                }}
                                disabled={updateTransferMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (updateTransferMutation.isPending) return;
                                  updateTransferMutation.mutate({ transferId: transfer.id, status: 'rejected' });
                                }}
                                disabled={updateTransferMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">{transaction.product?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.reason?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{transaction.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
