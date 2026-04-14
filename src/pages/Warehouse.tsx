import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStoreContext } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/utils/currency";
import { Plus, Package, AlertTriangle, TrendingUp, Check, X, Truck } from "lucide-react";

type SupplierRow = {
  id: string;
  name: string;
  is_active?: boolean | null;
};

type FactoryStockRow = {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  supplier?: string | null;
  supplier_id?: string | null;
  purchase_price?: number | null;
  min_stock_level?: number | null;
};

type WarehouseRequestRow = {
  id: string;
  business_id: string;
  shop_id?: string | null;
  requested_by: string;
  requested_at: string;
  item_name: string;
  quantity: number;
  unit: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  expense_id?: string | null;
  expense_amount?: number | null;
  complaint?: string | null;
  complaint_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type ProductionAllocationRequestRow = {
  id: string;
  business_id: string;
  factory_item_id: string;
  requested_by: string;
  requested_at: string;
  quantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed';
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  confirmation_notes?: string | null;
  created_at: string;
  updated_at: string;
  factory_stock?: {
    item_name: string;
    category: string;
    unit: string;
  };
};

export const WarehouseContent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { store } = useStoreContext();
  const currency = useMemo(() => (store?.currency || "RWF").trim().toUpperCase(), [store?.currency]);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [newStock, setNewStock] = useState({
    item_name: "",
    category: "",
    quantity: 0,
    unit: "kg",
    supplier: "",
    supplier_id: "",
    purchase_price: 0,
    min_stock_level: 0,
  });

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<WarehouseRequestRow | null>(null);
  const [newRequest, setNewRequest] = useState({
    item_name: "",
    quantity: 0,
    unit: "pieces",
    reason: "",
  });
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<WarehouseRequestRow | null>(null);
  const [approvalExpenseAmount, setApprovalExpenseAmount] = useState<number>(0);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (err && typeof err === "object" && "message" in err) {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
    return "Unknown error";
  };

  // Fetch warehouse stock
  const { data: warehouseStock = [], isLoading: stockLoading } = useQuery({
    queryKey: ["warehouse-stock"],
    queryFn: async () => {
      if (!store?.id) return [] as FactoryStockRow[];
      try {
        const filtered = await supabase
          .from("factory_stock")
          .select("*")
          .eq("business_id", store.id)
          .order("item_name");

        if (!filtered.error) return (filtered.data ?? []) as FactoryStockRow[];

        const fallback = await supabase
          .from("factory_stock")
          .select("*")
          .order("item_name");
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []) as FactoryStockRow[];
      } catch (err) {
        toast({ title: "Failed to load warehouse stock", description: getErrorMessage(err), variant: "destructive" });
        return [] as FactoryStockRow[];
      }
    },
    retry: false,
    enabled: !!store?.id,
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      if (!store?.id) return [] as SupplierRow[];
      try {
        const filtered = await supabase
          .from("suppliers")
          .select("*")
          .eq("business_id", store.id)
          .eq("is_active", true)
          .order("name");

        if (!filtered.error) return (filtered.data ?? []) as SupplierRow[];

        const fallback = await supabase
          .from("suppliers")
          .select("*")
          .eq("is_active", true)
          .order("name");
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []) as SupplierRow[];
      } catch (err) {
        toast({ title: "Failed to load suppliers", description: getErrorMessage(err), variant: "destructive" });
        return [] as SupplierRow[];
      }
    },
    retry: false,
    enabled: !!store?.id,
  });

  // Fetch warehouse requests
  const { data: warehouseRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["warehouse-requests"],
    queryFn: async () => {
      if (!store?.id) return [] as WarehouseRequestRow[];
      try {
        const { data, error } = await supabase
          .from("warehouse_requests")
          .select("*")
          .eq("business_id", store.id)
          .is("deleted_at", null)
          .order("requested_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as WarehouseRequestRow[];
      } catch (err) {
        toast({ title: "Failed to load warehouse requests", description: getErrorMessage(err), variant: "destructive" });
        return [] as WarehouseRequestRow[];
      }
    },
    retry: false,
    enabled: !!store?.id,
  });

  // Fetch production allocation requests
  const { data: productionAllocationRequests = [], isLoading: allocationRequestsLoading } = useQuery({
    queryKey: ["production-allocation-requests"],
    queryFn: async () => {
      if (!store?.id) return [] as ProductionAllocationRequestRow[];
      try {
        const { data, error } = await supabase
          .from("production_allocation_requests")
          .select("*, factory_stock(item_name, category, unit)")
          .eq("business_id", store.id)
          .order("requested_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as ProductionAllocationRequestRow[];
      } catch (err) {
        // Silently fail if table doesn't exist yet (migration not applied)
        console.warn("Production allocation requests not available yet");
        return [] as ProductionAllocationRequestRow[];
      }
    },
    retry: false,
    enabled: !!store?.id,
  });

  // Add new stock mutation
  const addStockMutation = useMutation({
    mutationFn: async (stockData: typeof newStock) => {
      if (!store?.id) {
        throw new Error("No active business selected");
      }

      const payloadWithBusinessId: Record<string, unknown> = {
        business_id: store.id,
        item_name: stockData.item_name,
        category: stockData.category,
        quantity: stockData.quantity,
        unit: stockData.unit,
        supplier: stockData.supplier,
        supplier_id: stockData.supplier_id || null,
        purchase_price: stockData.purchase_price,
        min_stock_level: stockData.min_stock_level,
      };

      const first = await supabase.from("factory_stock").insert(payloadWithBusinessId);
      if (!first.error) return;

      const msg = getErrorMessage(first.error);
      const errCode =
        first.error && typeof first.error === "object" && "code" in first.error ? (first.error as { code?: unknown }).code : undefined;
      const columnMissing =
        errCode === "PGRST204" ||
        (typeof msg === "string" && msg.toLowerCase().includes("business_id") && msg.toLowerCase().includes("could not find")) ||
        (typeof msg === "string" && msg.toLowerCase().includes('column "business_id"') && msg.toLowerCase().includes("does not exist"));
      if (!columnMissing) throw first.error;

      const payloadWithoutBusinessId: Record<string, unknown> = {
        item_name: stockData.item_name,
        category: stockData.category,
        quantity: stockData.quantity,
        unit: stockData.unit,
        supplier: stockData.supplier,
        supplier_id: stockData.supplier_id || null,
        purchase_price: stockData.purchase_price,
        min_stock_level: stockData.min_stock_level,
      };

      const second = await supabase.from("factory_stock").insert(payloadWithoutBusinessId);
      if (second.error) throw second.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      setIsAddStockOpen(false);
      setNewStock({
        item_name: "",
        category: "",
        quantity: 0,
        unit: "kg",
        supplier: "",
        supplier_id: "",
        purchase_price: 0,
        min_stock_level: 0,
      });
      toast({ title: "Stock added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding stock", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Handle production allocation request (approve/reject)
  const handleAllocationRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from("production_allocation_requests")
        .update({ status })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-allocation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      toast({ title: "Allocation request updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating allocation request", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Handle warehouse request (approve/reject)
  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, rejectedReason, expenseAmount }: { requestId: string; status: string; rejectedReason?: string; expenseAmount?: number }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'rejected' && rejectedReason) {
        updateData.rejected_reason = rejectedReason;
      }
      if (status === 'approved') {
        if (expenseAmount === undefined || expenseAmount <= 0) {
          throw new Error('Approval requires a valid expense amount');
        }
        updateData.expense_amount = expenseAmount;
      }

      const { error } = await supabase
        .from("warehouse_requests")
        .update(updateData)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-requests"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      toast({ title: "Request updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating request", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Create warehouse request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: typeof newRequest) => {
      if (!store?.id) {
        throw new Error("No active business selected");
      }

      const { error } = await supabase
        .from("warehouse_requests")
        .insert({
          business_id: store.id,
          requested_by: (await supabase.auth.getUser()).data.user?.id,
          item_name: requestData.item_name,
          quantity: requestData.quantity,
          unit: requestData.unit,
          reason: requestData.reason,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-requests"] });
      setIsRequestDialogOpen(false);
      setNewRequest({
        item_name: "",
        quantity: 0,
        unit: "pieces",
        reason: "",
      });
      toast({ title: "Request created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating request", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Update warehouse request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof newRequest> }) => {
      const { error } = await supabase
        .from("warehouse_requests")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-requests"] });
      setIsRequestDialogOpen(false);
      setEditingRequest(null);
      setNewRequest({
        item_name: "",
        quantity: 0,
        unit: "pieces",
        reason: "",
      });
      toast({ title: "Request updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating request", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Add complaint to rejected request
  const addComplaintMutation = useMutation({
    mutationFn: async ({ id, complaint }: { id: string; complaint: string }) => {
      const { error } = await supabase
        .from("warehouse_requests")
        .update({ complaint })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-requests"] });
      toast({ title: "Complaint submitted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error submitting complaint", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const { user, roles } = useAuth();
  const { hasPermission } = usePermissions();

  const lowStockItems = warehouseStock.filter(
    (item) => item.min_stock_level && item.quantity <= item.min_stock_level
  );

  const totalStockValue = warehouseStock.reduce(
    (sum, item) => sum + (item.quantity * (item.purchase_price || 0)),
    0
  );

  const pendingRequests = warehouseRequests.filter(r => r.status === "pending");

  const hasApproveRole = roles.some((role) => {
    if (typeof role.role !== "string") return false;
    const normalized = role.role.trim().toLowerCase();
    return ["super_admin", "admin", "owner", "store_owner", "finance"].includes(normalized);
  });
  const canApproveRequests = hasPermission("warehouse_requests.approve") || hasApproveRole;
  const currentUserIsLogistics = roles.some(
    (role) => typeof role.role === "string" && role.role.trim().toLowerCase() === "logistics"
  );

  const canApproveRequest = (request: WarehouseRequestRow) => {
    const isOwnRequest = user?.id === request.requested_by;
    return canApproveRequests && !(isOwnRequest && currentUserIsLogistics);
  };

  const openApproveDialog = (request: WarehouseRequestRow) => {
    setApprovalRequest(request);
    setApprovalExpenseAmount(request.expense_amount || 0);
    setIsApproveDialogOpen(true);
  };

  const closeApproveDialog = () => {
    setApprovalRequest(null);
    setApprovalExpenseAmount(0);
    setIsApproveDialogOpen(false);
  };

  const handleApproveRequest = () => {
    if (!approvalRequest) return;
    if (approvalExpenseAmount <= 0) {
      toast({ title: "Please enter a valid expense amount", variant: "destructive" });
      return;
    }

    handleRequestMutation.mutate({
      requestId: approvalRequest.id,
      status: "approved",
      expenseAmount: approvalExpenseAmount,
    });
    closeApproveDialog();
  };

  const handleCreateRequest = () => {
    if (!newRequest.item_name || !newRequest.reason || newRequest.quantity <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createRequestMutation.mutate(newRequest);
  };

  const handleEditRequest = (request: WarehouseRequestRow) => {
    setEditingRequest(request);
    setNewRequest({
      item_name: request.item_name,
      quantity: request.quantity,
      unit: request.unit,
      reason: request.reason,
    });
    setIsRequestDialogOpen(true);
  };

  const handleUpdateRequest = () => {
    if (!editingRequest || !newRequest.item_name || !newRequest.reason || newRequest.quantity <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    updateRequestMutation.mutate({
      id: editingRequest.id,
      data: newRequest
    });
  };

  const handleAddComplaint = (requestId: string, complaint: string) => {
    if (!complaint.trim()) {
      toast({ title: "Please enter a complaint", variant: "destructive" });
      return;
    }
    addComplaintMutation.mutate({ id: requestId, complaint });
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setNewStock({
      ...newStock,
      supplier_id: supplierId,
      supplier: supplier?.name || "",
    });
  };

  const handleAddStock = () => {
    if (!newStock.item_name || !newStock.category || newStock.quantity <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    addStockMutation.mutate(newStock);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Warehouse</h1>
            <p className="text-muted-foreground">Manage raw materials and stock</p>
          </div>
          <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Stock Inbound Registration</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={newStock.item_name}
                    onChange={(e) => setNewStock({ ...newStock, item_name: e.target.value })}
                    placeholder="e.g., Flour, Sugar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={newStock.category}
                    onValueChange={(value) => setNewStock({ ...newStock, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_materials">Raw Materials</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="ingredients">Ingredients</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newStock.quantity}
                    onChange={(e) => setNewStock({ ...newStock, quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={newStock.unit}
                    onValueChange={(value) => setNewStock({ ...newStock, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="g">Gram (g)</SelectItem>
                      <SelectItem value="L">Liter (L)</SelectItem>
                      <SelectItem value="mL">Milliliter (mL)</SelectItem>
                      <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="boxes">Boxes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select
                    value={newStock.supplier_id}
                    onValueChange={handleSupplierChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price (per unit)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newStock.purchase_price}
                    onChange={(e) => setNewStock({ ...newStock, purchase_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Stock Level</Label>
                  <Input
                    type="number"
                    value={newStock.min_stock_level}
                    onChange={(e) => setNewStock({ ...newStock, min_stock_level: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsAddStockOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStock} disabled={addStockMutation.isPending}>
                    {addStockMutation.isPending ? "Adding..." : "Add Stock"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{warehouseStock.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalStockValue, currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock">Current Stock</TabsTrigger>
            <TabsTrigger value="requests">
              Material Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle>Current Stock</CardTitle>
              </CardHeader>
              <CardContent>
                {stockLoading ? (
                  <p>Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Price/Unit</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouseStock.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{item.supplier || "-"}</TableCell>
                          <TableCell>{formatCurrency(item.purchase_price || 0, currency)}</TableCell>
                          <TableCell>{formatCurrency(item.quantity * (item.purchase_price || 0), currency)}</TableCell>
                          <TableCell>
                            {item.min_stock_level && item.quantity <= item.min_stock_level ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant="secondary">In Stock</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Warehouse Requests</h3>
                  <p className="text-sm text-muted-foreground">Request items and materials from finance</p>
                </div>
                <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRequest ? "Edit Request" : "New Warehouse Request"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Item Name *</Label>
                        <Input
                          value={newRequest.item_name}
                          onChange={(e) => setNewRequest({ ...newRequest, item_name: e.target.value })}
                          placeholder="e.g., Flour, Sugar, Packaging Boxes"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={newRequest.quantity}
                          onChange={(e) => setNewRequest({ ...newRequest, quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={newRequest.unit}
                          onValueChange={(value) => setNewRequest({ ...newRequest, unit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pieces">Pieces</SelectItem>
                            <SelectItem value="kg">Kilograms</SelectItem>
                            <SelectItem value="liters">Liters</SelectItem>
                            <SelectItem value="meters">Meters</SelectItem>
                            <SelectItem value="boxes">Boxes</SelectItem>
                            <SelectItem value="bags">Bags</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Reason for Request *</Label>
                        <Textarea
                          value={newRequest.reason}
                          onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                          placeholder="Explain why you need this item..."
                          rows={3}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsRequestDialogOpen(false);
                            setEditingRequest(null);
                            setNewRequest({
                              item_name: "",
                              quantity: 0,
                              unit: "pieces",
                              reason: "",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={editingRequest ? handleUpdateRequest : handleCreateRequest}
                          disabled={createRequestMutation.isPending || updateRequestMutation.isPending}
                        >
                          {createRequestMutation.isPending || updateRequestMutation.isPending
                            ? "Saving..."
                            : editingRequest
                            ? "Update Request"
                            : "Create Request"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Approve Warehouse Request</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Request</Label>
                        <Input
                          value={approvalRequest ? `${approvalRequest.item_name} — ${approvalRequest.quantity} ${approvalRequest.unit}` : ''}
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Expense Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={approvalExpenseAmount}
                          onChange={(e) => setApprovalExpenseAmount(Number(e.target.value))}
                          placeholder="Enter the expected expense amount"
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={closeApproveDialog}>
                          Cancel
                        </Button>
                        <Button onClick={handleApproveRequest} disabled={handleRequestMutation.isPending}>
                          {handleRequestMutation.isPending ? "Approving..." : "Approve Request"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  {requestsLoading ? (
                    <p className="p-6">Loading requests...</p>
                  ) : warehouseRequests.length === 0 ? (
                    <p className="p-6 text-muted-foreground">No warehouse requests yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.item_name}</TableCell>
                            <TableCell>{request.quantity} {request.unit}</TableCell>
                            <TableCell className="max-w-xs truncate" title={request.reason}>
                              {request.reason}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  request.status === "approved"
                                    ? "default"
                                    : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(request.requested_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {request.status === "pending" && user?.id === request.requested_by && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditRequest(request)}
                                  >
                                    Edit
                                  </Button>
                                )}
                                {request.status === "pending" && canApproveRequest(request) && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openApproveDialog(request)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleRequestMutation.mutate({
                                          requestId: request.id,
                                          status: "rejected",
                                        })
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {request.status === "pending" && !canApproveRequest(request) && (
                                  <Badge variant="outline">Awaiting approval</Badge>
                                )}
                                {request.status === "rejected" && !request.complaint && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const complaint = prompt("Enter your complaint about this rejection:");
                                      if (complaint) {
                                        handleAddComplaint(request.id, complaint);
                                      }
                                    }}
                                  >
                                    Add Complaint
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="low-stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <p className="text-muted-foreground">All stock levels are healthy</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Current Quantity</TableHead>
                        <TableHead>Minimum Level</TableHead>
                        <TableHead>Shortage</TableHead>
                        <TableHead>Supplier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-destructive font-bold">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell>
                            {item.min_stock_level} {item.unit}
                          </TableCell>
                          <TableCell className="text-destructive">
                            {(item.min_stock_level || 0) - item.quantity} {item.unit} needed
                          </TableCell>
                          <TableCell>{item.supplier || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Warehouse = () => (
  <ProtectedRoute requiredPermission="warehouse.access">
    <Layout>
      <WarehouseContent />
    </Layout>
  </ProtectedRoute>
);

export default Warehouse;
