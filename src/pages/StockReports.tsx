import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FileBarChart, Package, ArrowRightLeft, TrendingDown } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d", "#ffc658"];

export const StockReportsContent = () => {
  const { data: factoryStock } = useQuery({
    queryKey: ["factory-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factory_stock")
        .select("*")
        .order("item_name");
      if (error) throw error;
      return data;
    }
  });

  const { data: productionStock } = useQuery({
    queryKey: ["production-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_stock")
        .select("*, factory_stock(item_name, category, unit)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: allMovements } = useQuery({
    queryKey: ["all-stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, factory_stock(item_name, unit)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const entries = allMovements?.filter((m) => m.movement_type === "entry") || [];
  const transfers = allMovements?.filter((m) => m.movement_type === "transfer") || [];
  const usage = allMovements?.filter((m) => m.movement_type === "usage") || [];

  const categoryData = factoryStock?.reduce((acc: any[], item) => {
    const existing = acc.find((c) => c.name === item.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: item.category, value: 1 });
    }
    return acc;
  }, []) || [];

  const usageByItem = usage.reduce((acc: any[], movement) => {
    const itemName = (movement.factory_stock as any)?.item_name || "Unknown";
    const existing = acc.find((c) => c.name === itemName);
    if (existing) {
      existing.quantity += movement.quantity;
    } else {
      acc.push({ name: itemName, quantity: movement.quantity });
    }
    return acc;
  }, []).slice(0, 10);

  const movementsByDate = allMovements?.reduce((acc: any[], movement) => {
    const date = format(new Date(movement.created_at), "MMM dd");
    const existing = acc.find((c) => c.date === date);
    if (existing) {
      if (movement.movement_type === "entry") existing.entries += 1;
      if (movement.movement_type === "transfer") existing.transfers += 1;
      if (movement.movement_type === "usage") existing.usage += 1;
    } else {
      acc.push({
        date,
        entries: movement.movement_type === "entry" ? 1 : 0,
        transfers: movement.movement_type === "transfer" ? 1 : 0,
        usage: movement.movement_type === "usage" ? 1 : 0
      });
    }
    return acc;
  }, []).reverse().slice(-14) || [];

  return (
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stock Reports</h1>
            <p className="text-muted-foreground">Analytics & Full Movement History</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Factory Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{factoryStock?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileBarChart className="w-4 h-4" />
                  Total Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{entries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  Total Transfers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{transfers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Total Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{usage.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stock by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Consumed Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={usageByItem} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Movement Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={movementsByDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entries" name="Entries" fill="#22c55e" />
                  <Bar dataKey="transfers" name="Transfers" fill="#3b82f6" />
                  <Bar dataKey="usage" name="Usage" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Tabs defaultValue="entries" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="entries">All Entries ({entries.length})</TabsTrigger>
              <TabsTrigger value="transfers">All Transfers ({transfers.length})</TabsTrigger>
              <TabsTrigger value="usage">All Usage ({usage.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="entries">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{(entry.factory_stock as any)?.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="default">+{entry.quantity} {(entry.factory_stock as any)?.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{entry.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfers">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>From → To</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell>{format(new Date(transfer.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{(transfer.factory_stock as any)?.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{transfer.quantity} {(transfer.factory_stock as any)?.unit}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{transfer.from_stock}</span> → <span className="capitalize">{transfer.to_stock}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{transfer.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage">
              <Card>
                <CardHeader>
                  <CardTitle>Consumption History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity Used</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usage.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{format(new Date(u.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{(u.factory_stock as any)?.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">-{u.quantity} {(u.factory_stock as any)?.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
  );
};

const StockReports = () => (
  <ProtectedRoute requiredPermission="stock_reports.access">
    <Layout>
      <StockReportsContent />
    </Layout>
  </ProtectedRoute>
);

export default StockReports;
