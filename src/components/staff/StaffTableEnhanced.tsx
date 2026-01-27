import { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
  OnChangeFn,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Search,
  Download,
  Printer,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Filter,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_suspended: boolean;
  must_change_password?: boolean;
  roles: { role: string; shop_id?: string; shop?: { name: string } }[];
  created_at: string;
}

export interface StaffTableProps {
  data: StaffMember[];
  isLoading: boolean;
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (staffId: string) => void;
  onTransfer?: (staff: StaffMember) => void;
  onSuspend: (staffId: string, suspend: boolean) => void;
  onManagePermissions?: (staff: StaffMember) => void;
  onBatchDelete?: (staffIds: string[]) => void;
  onBatchTransfer?: (staffIds: string[]) => void;
  rowSelection?: RowSelectionState;
  setRowSelection?: OnChangeFn<RowSelectionState>;
}

export function StaffTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onTransfer,
  onSuspend,
  onManagePermissions,
  onBatchDelete,
  onBatchTransfer,
  rowSelection: externalRowSelection,
  setRowSelection: setExternalRowSelection,
}: StaffTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

  const rowSelection = externalRowSelection ?? internalRowSelection;
  const setRowSelection = setExternalRowSelection ?? setInternalRowSelection;

  const columns: ColumnDef<StaffMember>[] = [
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
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback>
                {member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{member.name}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <div>{row.getValue('phone') || '-'}</div>,
    },
    {
      accessorKey: 'roles',
      header: 'Role(s)',
      accessorFn: (row) => row.roles.map(r => r.role).join(', '),
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true;
        return row.original.roles.some(r => r.role === value);
      },
      cell: ({ row }) => {
        const roles = row.original.roles;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role, idx) => (
              <Badge key={idx} variant="outline">
                {role.role.replace('_', ' ').toUpperCase()}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'shop',
      header: 'Shop',
      accessorFn: (row) => {
        const shopNames = Array.from(
          new Set(row.roles.map((r) => r.shop?.name).filter(Boolean))
        );
        return shopNames.length > 0 ? shopNames.join(', ') : 'Headquarters';
      },
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true;
        if (value === 'Headquarters') {
           return row.getValue(id) === 'Headquarters';
        }
        return row.original.roles.some(r => r.shop?.name === value);
      },
      cell: ({ row }) => {
        const shopName = row.getValue('shop') as string;
        // Check if user has explicit headquarters access (null shop_id) which implies business-level access
        const hasHqAccess = row.original.roles.some(r => !r.shop_id);

        return (
          <div className="flex items-center gap-2">
            <span>{shopName}</span>
            {shopName === 'Headquarters' && hasHqAccess && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                All Shops
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      accessorFn: (row) => {
        if (row.is_suspended) return 'Suspended';
        if (row.must_change_password) return 'Reset Required';
        return 'Active';
      },
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true;
        return row.getValue(id) === value;
      },
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        if (status === 'Suspended') {
          return <Badge variant="destructive">Suspended</Badge>;
        }
        if (status === 'Reset Required') {
          return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Reset Required</Badge>;
        }
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            Active
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Joined
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return <div>{new Date(row.getValue('created_at')).toLocaleDateString()}</div>;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.id)}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(member)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
              )}
              {onTransfer && (
                <DropdownMenuItem onClick={() => onTransfer(member)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Shop
                </DropdownMenuItem>
              )}
              {onManagePermissions && (
                <DropdownMenuItem onClick={() => onManagePermissions(member)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Permissions
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSuspend(member.id, !member.is_suspended)}>
                {member.is_suspended ? (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Reactivate
                  </>
                ) : (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Suspend
                  </>
                )}
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(member.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Staff
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Staff List', 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Create table data
    const tableData = data.map(member => [
      member.name,
      member.email,
      member.phone || '-',
      member.roles.map(r => r.role).join(', '),
      Array.from(new Set(member.roles.map(r => r.shop?.name).filter(Boolean))).join(', ') || 'None',
      member.is_suspended ? 'Suspended' : 'Active',
      new Date(member.created_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [['Name', 'Email', 'Phone', 'Role', 'Shop', 'Status', 'Joined']],
      body: tableData,
      startY: 40,
    });

    doc.save('staff-list.pdf');
  };

  const handlePrint = () => {
    // Simple print implementation
    window.print();
  };

  // Extract unique values for filters
  const uniqueRoles = Array.from(new Set(data.flatMap(d => d.roles.map(r => r.role))));
  const uniqueShops = Array.from(new Set(data.flatMap(d => d.roles.map(r => r.shop?.name).filter(Boolean))));
  if (data.some(d => d.roles.some(r => !r.shop_id))) {
      if (!uniqueShops.includes('Headquarters')) {
          uniqueShops.unshift('Headquarters');
      }
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-[250px] bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
             <div className="h-10 w-20 bg-muted animate-pulse rounded" />
             <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="rounded-md border h-[400px] bg-muted/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Filter by name..."
                value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                    table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="max-w-sm pl-8"
                />
            </div>

            <Select
              value={(table.getColumn('roles')?.getFilterValue() as string) ?? 'all'}
              onValueChange={(value) => table.getColumn('roles')?.setFilterValue(value)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(table.getColumn('shop')?.getFilterValue() as string) ?? 'all'}
              onValueChange={(value) => table.getColumn('shop')?.setFilterValue(value)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {uniqueShops.map((shop) => (
                  <SelectItem key={shop} value={shop}>
                    {shop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
              onValueChange={(value) => table.getColumn('status')?.setFilterValue(value)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Reset Required">Reset Required</SelectItem>
              </SelectContent>
            </Select>

            {(table.getState().columnFilters.length > 0) && (
                <Button
                    variant="ghost"
                    onClick={() => table.resetColumnFilters()}
                    className="h-8 px-2 lg:px-3"
                >
                    Reset
                    <Filter className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                        }
                    >
                        {column.id}
                    </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-md border text-sm">
           <span className="font-medium ml-2">{table.getFilteredSelectedRowModel().rows.length} row(s) selected</span>
           <div className="flex-1" />
           {onBatchTransfer && (
             <Button size="sm" variant="outline" onClick={() => {
                const selectedIds = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
                onBatchTransfer(selectedIds);
             }}>
               <ArrowRightLeft className="mr-2 h-4 w-4" />
               Transfer Selected
             </Button>
           )}
           {onBatchDelete && (
             <Button size="sm" variant="destructive" onClick={() => {
                const selectedIds = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
                onBatchDelete(selectedIds);
             }}>
               <Trash2 className="mr-2 h-4 w-4" />
               Delete Selected
             </Button>
           )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
