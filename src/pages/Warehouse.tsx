import { useState } from "react";
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
import { Plus, Package, AlertTriangle, TrendingUp, Check, X, Truck } from "lucide-react";

export const WarehouseContent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Fetch warehouse stock
  const { data: warehouseStock = [], isLoading: stockLoading } = useQuery({
    queryKey: ["warehouse-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factory_stock")
        .select("*, suppliers(name)")
        .order("item_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending material requests
  const { data: materialRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["material-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_requests")
        .select("*, factory_stock(item_name, unit, quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Add new stock mutation
  const addStockMutation = useMutation({
    mutationFn: async (stockData: typeof newStock) => {
      const { error } = await supabase.from("factory_stock").insert({
        item_name: stockData.item_name,
        category: stockData.category,
        quantity: stockData.quantity,
        unit: stockData.unit,
        supplier: stockData.supplier,
        supplier_id: stockData.supplier_id || null,
        purchase_price: stockData.purchase_price,
        min_stock_level: stockData.min_stock_level,
      });
      if (error) throw error;
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
      toast({ title: "Error adding stock", description: error.message, variant: "destructive" });
    },
  });

  // Handle material request (approve/reject)
  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, rejectedReason }: { requestId: string; status: string; rejectedReason?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (rejectedReason) {
        updateData.rejected_reason = rejectedReason;
      }
      
      const { error } = await supabase
        .from("material_requests")
        .update(updateData)
        .eq("id", requestId);
      if (error) throw error;

      // If approved, deduct from warehouse stock
      if (status === "approved") {
        const request = materialRequests.find(r => r.id === requestId);
        if (request) {
          const currentStock = warehouseStock.find(s => s.id === request.warehouse_item_id);
          if (currentStock) {
            const newQuantity = currentStock.quantity - request.quantity_requested;
            const { error: stockError } = await supabase
              .from("factory_stock")
              .update({ quantity: newQuantity })
              .eq("id", request.warehouse_item_id);
            if (stockError) throw stockError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      toast({ title: "Request updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating request", description: error.message, variant: "destructive" });
    },
  });

  const lowStockItems = warehouseStock.filter(
    (item) => item.min_stock_level && item.quantity <= item.min_stock_level
  );

  const totalStockValue = warehouseStock.reduce(
    (sum, item) => sum + (item.quantity * (item.purchase_price || 0)),
    0
  );

  const pendingRequests = materialRequests.filter(r => r.status === "pending");

  const handleAddStock = () => {
    if (!newStock.item_name || !newStock.category) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    addStockMutation.mutate(newStock);
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setNewStock({
      ...newStock,
      supplier_id: supplierId,
      supplier: supplier?.name || "",
    });
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
              <div className="text-2xl font-bold">${totalStockValue.toFixed(2)}</div>
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
                          <TableCell>${item.purchase_price?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>${(item.quantity * (item.purchase_price || 0)).toFixed(2)}</TableCell>
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
            <Card>
              <CardHeader>
                <CardTitle>Material Requests from Production</CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <p>Loading...</p>
                ) : materialRequests.length === 0 ? (
                  <p className="text-muted-foreground">No material requests</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity Requested</TableHead>
                        <TableHead>Available Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.factory_stock?.item_name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {request.quantity_requested} {request.factory_stock?.unit}
                          </TableCell>
                          <TableCell>
                            {request.factory_stock?.quantity} {request.factory_stock?.unit}
                            {request.factory_stock && request.quantity_requested > request.factory_stock.quantity && (
                              <Badge variant="destructive" className="ml-2">Insufficient</Badge>
                            )}
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
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {request.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRequestMutation.mutate({
                                      requestId: request.id,
                                      status: "approved",
                                    })
                                  }
                                  disabled={
                                    request.factory_stock &&
                                    request.quantity_requested > request.factory_stock.quantity
                                  }
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
                                      rejectedReason: "Insufficient stock",
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
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
