import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Download, Printer,
  AlertTriangle, CheckCircle2, XCircle, Clock, Package, TrendingDown,
  MapPin, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { TenantInventoryTransactionDialog } from './TenantInventoryTransactionDialog';
import { InventoryTransactionDetailsDialog } from './InventoryTransactionDetailsDialog';
import { Plus, Minus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { useReactToPrint } from 'react-to-print';

import { UseMutationResult } from '@tanstack/react-query';

interface Shop {
  id: string;
  name: string;
  business_id: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  image_url?: string;
}

interface InventoryItem {
  product_id: string;
  stock: number;
  price: number;
  product?: Product;
}

interface Transfer {
  id: string;
  created_at: string;
  quantity: number;
  status: string;
  product?: Product;
  from_shop?: Shop;
  to_shop?: Shop;
  to_shop_id?: string;
}

interface Transaction {
  id: string;
  created_at: string;
  transaction_type: string;
  quantity: number;
  notes?: string;
  transfer_from_location?: string;
  transfer_to_location?: string;
  product?: Product;
  reason?: {
    name: string;
  };
}

interface ShopDetailViewProps {
  shop: Shop;
  inventory: InventoryItem[];
  transfers: Transfer[];
  transactions: Transaction[];
  onBack: () => void;
  updateTransferMutation: UseMutationResult<unknown, Error, { transferId: string; status: string }>;
}

const LOW_STOCK_THRESHOLD = 10;

import { transactionTypeFilterFn, getTransactionLabel } from './inventory-utils';

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

export function ShopDetailView({ 
  shop, 
  inventory, 
  transfers, 
  transactions, 
  onBack,
  updateTransferMutation 
}: ShopDetailViewProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const inventoryRef = useRef<HTMLDivElement>(null);
  const transfersRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const handlePrintInventory = useReactToPrint({
    contentRef: inventoryRef,
    documentTitle: shop ? `${shop.name}-inventory` : 'inventory',
  });

  const handlePrintTransfers = useReactToPrint({
    contentRef: transfersRef,
    documentTitle: shop ? `${shop.name}-transfers` : 'transfers',
  });

  const handlePrintHistory = useReactToPrint({
    contentRef: historyRef,
    documentTitle: shop ? `${shop.name}-history` : 'history',
  });

  // Deduplicate inventory items by product_id to prevent display issues
  const uniqueInventory = useMemo(() => {
    return inventory?.reduce((acc: InventoryItem[], current) => {
      if (!current.product_id) return acc;
      const exists = acc.find(item => item.product_id === current.product_id);
      if (!exists) {
        return acc.concat([current]);
      }
      return acc;
    }, []) || [];
  }, [inventory]);

  const categories = useMemo(() => {
    const cats = new Set(uniqueInventory.map(item => item.product?.category).filter((c): c is string => !!c));
    return Array.from(cats).map(cat => ({ label: cat, value: cat }));
  }, [uniqueInventory]);

  const inventoryColumns: ColumnDef<InventoryItem>[] = useMemo(() => {
    if (!shop) return [];
    return [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
      accessorKey: "product.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row, table }) => {
        const item = row.original;
        const searchTerm = (table.getState().globalFilter as string) || "";
        return (
          <div className="flex items-center gap-3">
            {item.product?.image_url && (
              <img 
                src={item.product.image_url} 
                alt={item.product.name} 
                className="w-8 h-8 rounded object-cover"
              />
            )}
            <span className="font-medium">
                <HighlightedText text={item.product?.name} searchTerm={searchTerm} />
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "product.category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => <div className="text-right">{row.original.price?.toLocaleString()} RWF</div>,
    },
    {
      accessorKey: "stock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Stock" />,
      cell: ({ row }) => <div className="text-right font-medium">{row.original.stock}</div>,
    },
    {
      id: "status",
      accessorFn: (row) => {
          if (row.stock === 0) return "Out of Stock";
          if (row.stock <= LOW_STOCK_THRESHOLD) return "Low Stock";
          return "In Stock";
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const stock = row.original.stock;
        if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
        if (stock <= LOW_STOCK_THRESHOLD) return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Low Stock</Badge>;
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">In Stock</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TenantInventoryTransactionDialog
            businessId={shop.business_id}
            type="in"
            initialShopId={shop.id}
            initialProductId={row.original.product_id}
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
            initialProductId={row.original.product_id}
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
      ),
    },
    ];
  }, [shop]);

  const transferColumns: ColumnDef<Transfer>[] = useMemo(() => {
    if (!shop) return [];
    return [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
    {
      accessorKey: "product.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row, table }) => {
          const searchTerm = (table.getState().globalFilter as string) || "";
          return <span className="font-medium"><HighlightedText text={row.original.product?.name} searchTerm={searchTerm} /></span>
      },
    },
    {
      accessorKey: "from_shop.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="From" />,
    },
    {
      accessorKey: "to_shop.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="To" />,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      cell: ({ row }) => <div className="text-right">{row.original.quantity}</div>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => getStatusBadge(row.original.status),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const transfer = row.original;
        if (transfer.status === 'pending' && transfer.to_shop_id === shop.id) {
            return (
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
            )
        }
        return null;
      }
    },
    ];
  }, [shop, updateTransferMutation]);

  const historyColumns: ColumnDef<Transaction>[] = useMemo(() => [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy HH:mm'),
    },
    {
        accessorKey: "product.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        cell: ({ row, table }) => {
            const searchTerm = (table.getState().globalFilter as string) || "";
            return <span className="font-medium"><HighlightedText text={row.original.product?.name} searchTerm={searchTerm} /></span>
        },
    },
    {
        accessorKey: "transaction_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <Badge variant="outline">{getTransactionLabel(row.original.transaction_type)}</Badge>,
        filterFn: transactionTypeFilterFn,
    },
    {
        accessorKey: "reason.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
        cell: ({ row }) => row.original.reason?.name || '-',
    },
    {
        accessorKey: "transfer_from_location",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transfer From" />,
        cell: ({ row }) => row.original.transfer_from_location || '-',
    },
    {
        accessorKey: "transfer_to_location",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transfer To" />,
        cell: ({ row }) => row.original.transfer_to_location || '-',
    },
    {
        accessorKey: "quantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
        cell: ({ row }) => {
            const qty = row.original.quantity;
            return <div className="text-right">{qty > 0 ? '+' : ''}{qty}</div>
        },
    },
    {
        accessorKey: "notes",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
        cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.notes || '-'}</span>,
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
            <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
                setSelectedTransaction(row.original);
                setIsDetailsOpen(true);
            }}
            >
            <Eye className="h-4 w-4" />
            </Button>
        ),
    },
  ], []);

  if (!shop) return null;

  const inventoryStatuses = [
    { label: "In Stock", value: "In Stock" },
    { label: "Low Stock", value: "Low Stock" },
    { label: "Out of Stock", value: "Out of Stock" },
  ];

  const transferStatuses = [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
  ];

  const transactionTypes = [
      { label: "Stock In", value: "stock_in" },
      { label: "Stock Out", value: "stock_out" },
      { label: "Transfer In", value: "transfer_in" },
      { label: "Transfer Out", value: "transfer_out" },
      { label: "Sale", value: "sale" },
  ];

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

  const handleExportInventory = () => {
    const headers = ['Product', 'Category', 'Stock', 'Price', 'Status'];
    const csvContent = [
      headers.join(','),
      ...uniqueInventory.map(item => [
        `"${item.product?.name}"`,
        `"${item.product?.category}"`,
        item.stock,
        item.price,
        item.stock === 0 ? 'Out of Stock' : item.stock <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'In Stock'
      ].join(','))
    ].join('\n');

    downloadCsv(csvContent, `${shop.name}_inventory_report.csv`);
  };

  const handleExportTransfers = () => {
    const headers = ['Date', 'Product', 'From', 'To', 'Quantity', 'Status'];
    const csvContent = [
      headers.join(','),
      ...transfers.map(item => [
        format(new Date(item.created_at), 'yyyy-MM-dd'),
        `"${item.product?.name}"`,
        `"${item.from_shop?.name}"`,
        `"${item.to_shop?.name}"`,
        item.quantity,
        item.status
      ].join(','))
    ].join('\n');
    downloadCsv(csvContent, `${shop.name}_transfers.csv`);
  };

  const handleExportHistory = () => {
    const headers = ['Date', 'Product', 'Type', 'Reason', 'From', 'To', 'Quantity', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(item => [
        format(new Date(item.created_at), 'yyyy-MM-dd HH:mm'),
        `"${item.product?.name}"`,
        item.transaction_type,
        `"${item.reason?.name || ''}"`,
        `"${item.transfer_from_location || ''}"`,
        `"${item.transfer_to_location || ''}"`,
        item.quantity,
        `"${item.notes || ''}"`
      ].join(','))
    ].join('\n');
    downloadCsv(csvContent, `${shop.name}_history.csv`);
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

        <TabsContent value="inventory" className="space-y-4 data-[state=inactive]:hidden" forceMount={true}>
          <div ref={inventoryRef} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <div></div> {/* Spacer */}
            </div>
            <Tabs defaultValue="all" className="w-full">
              <div className="w-full overflow-x-auto pb-2">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
                  <TabsTrigger value="all" className="min-w-[80px]">All Items</TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger key={cat.value} value={cat.value} className="whitespace-nowrap">
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardContent className="p-2 md:p-4">
                    <DataTable 
                      columns={inventoryColumns} 
                      data={uniqueInventory} 
                      placeholder="Search products..."
                      filterableColumns={[
                        {
                          id: "product_category",
                          title: "Category",
                          options: categories
                        },
                        {
                          id: "status",
                          title: "Status",
                          options: inventoryStatuses
                        }
                      ]}
                      actions={
                        <div className="flex gap-2 print:hidden">
                          <Button variant="outline" size="sm" onClick={handlePrintInventory}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleExportInventory}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </Button>
                        </div>
                      }
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {categories.map((cat) => (
                <TabsContent key={cat.value} value={cat.value} className="mt-4">
                  <Card>
                    <CardContent className="p-2 md:p-4">
                      <DataTable 
                        columns={inventoryColumns} 
                        data={uniqueInventory.filter(item => item.product?.category === cat.value)}
                        placeholder={`Search ${cat.label}...`}
                        filterableColumns={[
                          {
                            id: "status",
                            title: "Status",
                            options: inventoryStatuses
                          }
                        ]}
                        actions={
                            <div className="flex gap-2 print:hidden">
                              <Button variant="outline" size="sm" onClick={handlePrintInventory}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                              </Button>
                              <Button variant="outline" size="sm" onClick={handleExportInventory}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                              </Button>
                            </div>
                          }
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4 data-[state=inactive]:hidden" forceMount={true}>
          <div ref={transfersRef}>
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Stock Transfers</CardTitle>
                  <CardDescription>Transfers involving this shop</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-4">
                 <DataTable 
                  columns={transferColumns} 
                  data={transfers} 
                  placeholder="Search transfers..."
                  dateFilterColumn="created_at"
                  filterableColumns={[
                      {
                          id: "status",
                          title: "Status",
                          options: transferStatuses
                      }
                  ]}
                  actions={
                    <div className="flex gap-2 print:hidden">
                      <Button variant="outline" size="sm" onClick={handlePrintTransfers}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportTransfers}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 data-[state=inactive]:hidden" forceMount={true}>
          <div ref={historyRef}>
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4">
                 <DataTable 
                  columns={historyColumns} 
                  data={transactions} 
                  placeholder="Search history..."
                  dateFilterColumn="created_at"
                  filterableColumns={[
                      {
                          id: "transaction_type",
                          title: "Type",
                          options: transactionTypes
                      }
                  ]}
                  actions={
                    <div className="flex gap-2 print:hidden">
                      <Button variant="outline" size="sm" onClick={handlePrintHistory}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportHistory}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <InventoryTransactionDetailsDialog 
        transaction={selectedTransaction}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
}
