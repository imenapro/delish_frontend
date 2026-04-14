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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Utensils, History, TrendingDown, Plus, Package } from "lucide-react";
import { format } from "date-fns";
import { useStoreContext } from "@/contexts/StoreContext";

export const ProductionStockContent = () => {
  const queryClient = useQueryClient();
  const { store } = useStoreContext();
  const [isConsumeDialogOpen, setIsConsumeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [consumeQuantity, setConsumeQuantity] = useState("");
  const [consumeNotes, setConsumeNotes] = useState("");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    factory_item_id: "",
    quantity: "",
    reason: "",
  });

  const { data: productionStock, isLoading } = useQuery({
    queryKey: ["production-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_stock")
        .select("*, factory_stock(item_name, category, unit)")
        .eq("business_id", store?.id)
        .order("created_at", { ascending: false });
      if (error) {
        // Table might not exist yet if migration hasn't been applied
        if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!store?.id,
    retry: false
  });

  const { data: usageMovements } = useQuery({
    queryKey: ["usage-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, factory_stock(item_name, unit)")
        .eq("movement_type", "usage")
        .eq("business_id", store?.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        // Table might not exist yet if migration hasn't been applied
        if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!store?.id,
    retry: false
  });

  // Fetch available warehouse items for allocation requests
  const { data: warehouseItems } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factory_stock")
        .select("id, item_name, category, quantity, unit")
        .eq("business_id", store?.id)
        .gt("quantity", 0)
        .order("item_name");
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id
  });

  // Fetch approved allocation requests that need confirmation
  const { data: pendingConfirmations } = useQuery({
    queryKey: ["pending-confirmations"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("production_allocation_requests")
        .select("*, factory_stock(item_name, category, unit)")
        .eq("business_id", store?.id)
        .eq("requested_by", user.user.id)
        .eq("status", "approved")
        .is("confirmed_at", null);
      if (error) {
        // Table might not exist yet if migration hasn't been applied
        if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!store?.id,
    retry: false
  });

  const consumeMutation = useMutation({
    mutationFn: async ({ productionStockId, factoryItemId, quantity, notes }: { 
      productionStockId: string; 
      factoryItemId: string;
      quantity: number; 
      notes: string 
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data: currentStock } = await supabase
        .from("production_stock")
        .select("quantity")
        .eq("id", productionStockId)
        .single();

      if (!currentStock || currentStock.quantity < quantity) {
        throw new Error("Insufficient stock in production");
      }

      const { error: updateError } = await supabase
        .from("production_stock")
        .update({ quantity: currentStock.quantity - quantity })
        .eq("id", productionStockId);

      if (updateError) throw updateError;

      await supabase.from("stock_movements").insert({
        business_id: store?.id,
        factory_item_id: factoryItemId,
        movement_type: "usage",
        quantity: quantity,
        from_stock: "production",
        notes: notes || "Production consumption",
        created_by: user.user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stock"] });
      queryClient.invalidateQueries({ queryKey: ["usage-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast({ title: "Consumption recorded successfully" });
      setIsConsumeDialogOpen(false);
      setConsumeQuantity("");
      setConsumeNotes("");
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Error recording consumption", description: error.message, variant: "destructive" });
    }
  });

  // Create allocation request mutation
  const createAllocationRequestMutation = useMutation({
    mutationFn: async (requestData: typeof newRequest) => {
      if (!store?.id) {
        throw new Error("No active business selected");
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("production_allocation_requests")
        .insert({
          business_id: store.id,
          factory_item_id: requestData.factory_item_id,
          requested_by: user.user.id,
          quantity: parseFloat(requestData.quantity),
          reason: requestData.reason,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-allocation-requests"] });
      toast({ title: "Allocation request created successfully" });
      setIsRequestDialogOpen(false);
      setNewRequest({
        factory_item_id: "",
        quantity: "",
        reason: "",
      });
    },
    onError: (error) => {
      toast({ title: "Error creating request", description: (error as Error).message, variant: "destructive" });
    }
  });

  // Confirm receipt of allocated items
  const confirmReceiptMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      const { error } = await supabase
        .from("production_allocation_requests")
        .update({
          status: 'confirmed',
          confirmation_notes: notes
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["production-stock"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast({ title: "Receipt confirmed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error confirming receipt", description: (error as Error).message, variant: "destructive" });
    }
  });

  const totalItems = productionStock?.length || 0;
  const totalUsageToday = usageMovements?.filter(
    (m) => format(new Date(m.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;

  return (
    <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Production Stock</h1>
              <p className="text-muted-foreground">Usage & Consumption Tracking</p>
            </div>
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Request Allocation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Request Stock Allocation</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Select Item from Warehouse</Label>
                    <Select
                      value={newRequest.factory_item_id}
                      onValueChange={(value) => setNewRequest({ ...newRequest, factory_item_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseItems?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_name} ({item.quantity} {item.unit} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Requested</Label>
                    <Input
                      type="number"
                      value={newRequest.quantity}
                      onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason for Request</Label>
                    <Textarea
                      value={newRequest.reason}
                      onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                      placeholder="Why do you need this item?"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createAllocationRequestMutation.mutate(newRequest)}
                      disabled={createAllocationRequestMutation.isPending || !newRequest.factory_item_id || !newRequest.quantity || !newRequest.reason}
                    >
                      {createAllocationRequestMutation.isPending ? "Creating..." : "Create Request"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Items in Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItems}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usage Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsageToday}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Movements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageMovements?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Confirmations Card */}
          {pendingConfirmations && pendingConfirmations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Pending Confirmations
                  <Badge variant="secondary">{pendingConfirmations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingConfirmations.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {(request.factory_stock as any)?.item_name}
                        </TableCell>
                        <TableCell>{request.quantity} {(request.factory_stock as any)?.unit}</TableCell>
                        <TableCell>
                          {format(new Date(request.requested_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => confirmReceiptMutation.mutate({ 
                              requestId: request.id,
                              notes: "Confirmed receipt of allocated items"
                            })}
                            disabled={confirmReceiptMutation.isPending}
                          >
                            Confirm Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                Production Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : productionStock?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No items in production stock. Transfer materials from Factory Stock to get started.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = "/factory-stock"}>
                    Go to Factory Stock
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Available Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionStock?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {(item.factory_stock as any)?.item_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {(item.factory_stock as any)?.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={item.quantity <= 0 ? "text-destructive font-bold" : ""}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{(item.factory_stock as any)?.unit}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setIsConsumeDialogOpen(true);
                            }}
                            disabled={item.quantity <= 0}
                          >
                            <TrendingDown className="w-4 h-4 mr-1" />
                            Use
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Consumption History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageMovements?.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No consumption recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity Used</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageMovements?.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {format(new Date(movement.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {(movement.factory_stock as any)?.item_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">-{movement.quantity}</Badge>
                        </TableCell>
                        <TableCell>{(movement.factory_stock as any)?.unit}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={isConsumeDialogOpen} onOpenChange={setIsConsumeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Record Usage - {(selectedItem?.factory_stock as any)?.item_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Available: {selectedItem?.quantity} {(selectedItem?.factory_stock as any)?.unit}
                </p>
                <div>
                  <Label>Quantity Used ({(selectedItem?.factory_stock as any)?.unit})</Label>
                  <Input
                    type="number"
                    value={consumeQuantity}
                    onChange={(e) => setConsumeQuantity(e.target.value)}
                    placeholder="Enter quantity consumed"
                    max={selectedItem?.quantity}
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={consumeNotes}
                    onChange={(e) => setConsumeNotes(e.target.value)}
                    placeholder="e.g., Used for morning batch"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => consumeMutation.mutate({
                    productionStockId: selectedItem?.id,
                    factoryItemId: selectedItem?.factory_item_id,
                    quantity: parseFloat(consumeQuantity),
                    notes: consumeNotes
                  })}
                  disabled={!consumeQuantity || parseFloat(consumeQuantity) <= 0 || parseFloat(consumeQuantity) > selectedItem?.quantity}
                >
                  Record Consumption
                </Button>
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
};

const ProductionStock = () => (
  <ProtectedRoute requiredPermission="production_stock.access">
    <Layout>
      <ProductionStockContent />
    </Layout>
  </ProtectedRoute>
);

export default ProductionStock;
