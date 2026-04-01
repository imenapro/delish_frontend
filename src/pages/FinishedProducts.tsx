import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Package, Truck, Store, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export const FinishedProductsContent = () => {
  const queryClient = useQueryClient();
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [dispatchData, setDispatchData] = useState({
    quantity: "",
    to_shop_id: "",
    transport_info: ""
  });

  // Fetch finished products stock
  const { data: finishedProducts, isLoading } = useQuery({
    queryKey: ["finished-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finished_products_stock")
        .select(`
          *,
          products(id, name, price),
          recipes(id, name),
          shops(id, name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch shops for dispatch
  const { data: shops } = useQuery({
    queryKey: ["shops-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  // Fetch dispatches
  const { data: dispatches } = useQuery({
    queryKey: ["finished-product-dispatches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finished_product_dispatches")
        .select(`
          *,
          finished_products_stock(id, products(name)),
          shops!finished_product_dispatches_to_shop_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  // Dispatch product mutation
  const dispatchMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; toShopId: string; transportInfo: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Check available quantity
      const { data: product } = await supabase
        .from("finished_products_stock")
        .select("quantity, warehouse_location")
        .eq("id", data.productId)
        .single();

      if (!product || product.quantity < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${product?.quantity || 0}`);
      }

      // Create dispatch record
      const { error: dispatchError } = await supabase
        .from("finished_product_dispatches")
        .insert({
          finished_product_id: data.productId,
          to_shop_id: data.toShopId,
          quantity: data.quantity,
          from_location: product.warehouse_location,
          transport_info: data.transportInfo,
          dispatched_by: user.user?.id,
          status: "dispatched"
        });

      if (dispatchError) throw dispatchError;

      // Update stock quantity
      const { error: updateError } = await supabase
        .from("finished_products_stock")
        .update({ 
          quantity: product.quantity - data.quantity,
          status: product.quantity - data.quantity === 0 ? "dispatched" : "available"
        })
        .eq("id", data.productId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finished-products"] });
      queryClient.invalidateQueries({ queryKey: ["finished-product-dispatches"] });
      toast({ title: "Product dispatched to store successfully" });
      setIsDispatchDialogOpen(false);
      setDispatchData({ quantity: "", to_shop_id: "", transport_info: "" });
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error dispatching product", description: error.message, variant: "destructive" });
    }
  });

  // Mark dispatch as delivered
  const markDeliveredMutation = useMutation({
    mutationFn: async (dispatchId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("finished_product_dispatches")
        .update({
          status: "delivered",
          received_date: new Date().toISOString(),
          received_by: user.user?.id
        })
        .eq("id", dispatchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finished-product-dispatches"] });
      toast({ title: "Dispatch marked as delivered" });
    }
  });

  const totalProducts = finishedProducts?.length || 0;
  const totalQuantity = finishedProducts?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
  const lowStockProducts = finishedProducts?.filter(p => p.quantity <= 10 && p.quantity > 0) || [];

  return (
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Finished Products</h1>
              <p className="text-muted-foreground">Manage finished products and dispatch to stores</p>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Low Stock Alert ({lowStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.map((item) => (
                    <Badge key={item.id} variant="outline" className="border-amber-500 text-amber-600">
                      {item.products?.name || "Unknown"}: {item.quantity} {item.unit}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Product Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Total Units in Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalQuantity}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Pending Dispatches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dispatches?.filter(d => d.status === "dispatched" || d.status === "in_transit").length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Finished Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Finished Products Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : finishedProducts?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No finished products in stock. Complete production runs to add finished products.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Recipe</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finishedProducts?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.products?.name || "Unknown Product"}
                        </TableCell>
                        <TableCell>{item.recipes?.name || "-"}</TableCell>
                        <TableCell>
                          <span className={item.quantity <= 10 ? "text-amber-600 font-bold" : ""}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>${(item.cost_per_unit || 0).toFixed(2)}</TableCell>
                        <TableCell>{item.batch_number || "-"}</TableCell>
                        <TableCell>{item.warehouse_location || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "available" ? "default" :
                            item.status === "reserved" ? "secondary" :
                            item.status === "dispatched" ? "outline" : "destructive"
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={item.quantity <= 0}
                            onClick={() => {
                              setSelectedProduct(item);
                              setIsDispatchDialogOpen(true);
                            }}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Dispatch
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Dispatches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Recent Dispatches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispatches?.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No dispatches yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>To Store</TableHead>
                      <TableHead>Transport</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatches?.map((dispatch) => (
                      <TableRow key={dispatch.id}>
                        <TableCell>
                          {format(new Date(dispatch.dispatch_date), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell>
                          {(dispatch.finished_products_stock as any)?.products?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{dispatch.quantity}</TableCell>
                        <TableCell>{(dispatch.shops as any)?.name || "Unknown"}</TableCell>
                        <TableCell>{dispatch.transport_info || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            dispatch.status === "delivered" ? "default" :
                            dispatch.status === "in_transit" ? "secondary" : "outline"
                          }>
                            {dispatch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dispatch.status !== "delivered" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markDeliveredMutation.mutate(dispatch.id)}
                            >
                              Mark Delivered
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Dispatch Dialog */}
          <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Dispatch to Store - {selectedProduct?.products?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Available: {selectedProduct?.quantity} {selectedProduct?.unit}
                </p>
                <div>
                  <Label>Destination Store *</Label>
                  <Select
                    value={dispatchData.to_shop_id}
                    onValueChange={(val) => setDispatchData({ ...dispatchData, to_shop_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops?.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity to Dispatch *</Label>
                  <Input
                    type="number"
                    value={dispatchData.quantity}
                    onChange={(e) => setDispatchData({ ...dispatchData, quantity: e.target.value })}
                    placeholder="Enter quantity"
                    max={selectedProduct?.quantity}
                  />
                </div>
                <div>
                  <Label>Transport Information</Label>
                  <Input
                    value={dispatchData.transport_info}
                    onChange={(e) => setDispatchData({ ...dispatchData, transport_info: e.target.value })}
                    placeholder="e.g., Driver name, vehicle number"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => dispatchMutation.mutate({
                    productId: selectedProduct?.id,
                    quantity: parseFloat(dispatchData.quantity),
                    toShopId: dispatchData.to_shop_id,
                    transportInfo: dispatchData.transport_info
                  })}
                  disabled={
                    !dispatchData.to_shop_id ||
                    !dispatchData.quantity ||
                    parseFloat(dispatchData.quantity) <= 0 ||
                    parseFloat(dispatchData.quantity) > (selectedProduct?.quantity || 0) ||
                    dispatchMutation.isPending
                  }
                >
                  {dispatchMutation.isPending ? "Dispatching..." : "Dispatch to Store"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
  );
};

const FinishedProducts = () => (
  <ProtectedRoute requiredPermission="finished_products.access">
    <Layout>
      <FinishedProductsContent />
    </Layout>
  </ProtectedRoute>
);

export default FinishedProducts;
