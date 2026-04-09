import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useStoreContext } from "@/contexts/StoreContext";
import { formatCurrency } from "@/utils/currency";
import { Plus, BookOpen, Trash2, Edit, DollarSign, Package } from "lucide-react";

export const RecipesContent = () => {
  const queryClient = useQueryClient();
  const { store } = useStoreContext();
  const currency = useMemo(() => (store?.currency || "RWF").trim().toUpperCase(), [store?.currency]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    output_quantity: "1",
    output_unit: "pcs",
    product_id: ""
  });
  const [ingredients, setIngredients] = useState<Array<{
    warehouse_item_id: string;
    quantity_per_unit: string;
    unit: string;
    item_name?: string;
  }>>([]);

  // Fetch recipes
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      if (!store?.id) return [];

      const baseSelect = `
        *,
        products(id, name),
        recipe_ingredients(
          id,
          warehouse_item_id,
          quantity_per_unit,
          unit,
          cost_per_ingredient,
          factory_stock(id, item_name, purchase_price, unit)
        )
      `;

      const filtered = await supabase
        .from("recipes")
        .select(baseSelect)
        .eq("business_id", store.id)
        .eq("is_active", true)
        .order("name");

      if (!filtered.error) return filtered.data ?? [];

      const errCode =
        filtered.error && typeof filtered.error === "object" && "code" in filtered.error
          ? (filtered.error as { code?: unknown }).code
          : undefined;

      if (errCode !== "PGRST204") throw filtered.error;

      const fallback = await supabase
        .from("recipes")
        .select(baseSelect)
        .eq("is_active", true)
        .order("name");
      if (fallback.error) throw fallback.error;
      return fallback.data ?? [];
    }
  , enabled: !!store?.id });

  // Fetch warehouse items for ingredient selection
  const { data: warehouseItems } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: async () => {
      if (!store?.id) return [];

      const filtered = await supabase
        .from("factory_stock")
        .select("id, item_name, unit, purchase_price, quantity")
        .eq("business_id", store.id)
        .order("item_name");

      if (!filtered.error) return filtered.data ?? [];

      const errCode =
        filtered.error && typeof filtered.error === "object" && "code" in filtered.error
          ? (filtered.error as { code?: unknown }).code
          : undefined;
      if (errCode !== "PGRST204") throw filtered.error;

      const fallback = await supabase
        .from("factory_stock")
        .select("id, item_name, unit, purchase_price, quantity")
        .order("item_name");
      if (fallback.error) throw fallback.error;
      return fallback.data ?? [];
    }
  , enabled: !!store?.id });

  // Fetch products for linking
  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      if (!store?.id) return [];

      const filtered = await supabase
        .from("products")
        .select("id, name")
        .eq("business_id", store.id)
        .eq("is_active", true)
        .order("name");

      if (!filtered.error) return filtered.data ?? [];

      const errCode =
        filtered.error && typeof filtered.error === "object" && "code" in filtered.error
          ? (filtered.error as { code?: unknown }).code
          : undefined;
      if (errCode !== "PGRST204") throw filtered.error;

      const fallback = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (fallback.error) throw fallback.error;
      return fallback.data ?? [];
    }
  , enabled: !!store?.id });

  // Calculate recipe cost
  const calculateRecipeCost = (ingredientsList: typeof ingredients) => {
    return ingredientsList.reduce((total, ing) => {
      const item = warehouseItems?.find(w => w.id === ing.warehouse_item_id);
      const price = item?.purchase_price || 0;
      const qty = parseFloat(ing.quantity_per_unit) || 0;
      return total + (price * qty);
    }, 0);
  };

  // Add recipe mutation
  const addRecipeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) {
        throw new Error("No active business selected");
      }
      const { data: user } = await supabase.auth.getUser();
      const totalCost = calculateRecipeCost(ingredients);
      const outputQty = parseFloat(data.output_quantity) || 1;
      const costPerUnit = totalCost / outputQty;

      // Create recipe
      const payloadWithBusinessId: Record<string, unknown> = {
        business_id: store.id,
        name: data.name,
        description: data.description,
        output_quantity: outputQty,
        output_unit: data.output_unit,
        product_id: data.product_id || null,
        total_cost: totalCost,
        cost_per_unit: costPerUnit,
        created_by: user.user?.id,
      };

      const first = await supabase.from("recipes").insert(payloadWithBusinessId).select().single();

      const errCode =
        first.error && typeof first.error === "object" && "code" in first.error ? (first.error as { code?: unknown }).code : undefined;

      const businessColumnMissing =
        errCode === "PGRST204" ||
        (first.error?.message?.toLowerCase?.().includes?.("business_id") && first.error?.message?.toLowerCase?.().includes?.("schema cache"));

      const newRecipe = first.data;

      if (first.error && !businessColumnMissing) throw first.error;

      if (!newRecipe && businessColumnMissing) {
        const payloadWithoutBusinessId: Record<string, unknown> = {
          name: data.name,
          description: data.description,
          output_quantity: outputQty,
          output_unit: data.output_unit,
          product_id: data.product_id || null,
          total_cost: totalCost,
          cost_per_unit: costPerUnit,
          created_by: user.user?.id,
        };

        const second = await supabase.from("recipes").insert(payloadWithoutBusinessId).select().single();
        if (second.error) throw second.error;
        if (!second.data) throw new Error("Failed to create recipe");
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const newRecipe = second.data;

      // Add ingredients
        if (ingredients.length > 0) {
          const ingredientData = ingredients.map((ing) => {
            const item = warehouseItems?.find((w: any) => w.id === ing.warehouse_item_id);
            return {
              recipe_id: newRecipe.id,
              warehouse_item_id: ing.warehouse_item_id,
              quantity_per_unit: parseFloat(ing.quantity_per_unit),
              unit: ing.unit || item?.unit || "pcs",
              cost_per_ingredient: (item?.purchase_price || 0) * parseFloat(ing.quantity_per_unit),
            };
          });

          const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(ingredientData);

          if (ingredientsError) throw ingredientsError;
        }

        return newRecipe;
      }

      if (!newRecipe) throw new Error("Failed to create recipe");

      if (ingredients.length > 0) {
        const ingredientData = ingredients.map((ing) => {
          const item = warehouseItems?.find((w: any) => w.id === ing.warehouse_item_id);
          return {
            recipe_id: newRecipe.id,
            warehouse_item_id: ing.warehouse_item_id,
            quantity_per_unit: parseFloat(ing.quantity_per_unit),
            unit: ing.unit || item?.unit || "pcs",
            cost_per_ingredient: (item?.purchase_price || 0) * parseFloat(ing.quantity_per_unit),
          };
        });

        const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(ingredientData);

        if (ingredientsError) throw ingredientsError;
      }

      return newRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast({ title: "Recipe created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating recipe", description: error.message, variant: "destructive" });
    }
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!store?.id) throw new Error("No active business selected");

      const filtered = await supabase.from("recipes").update({ is_active: false }).eq("id", recipeId).eq("business_id", store.id);
      if (!filtered.error) return;

      const errCode =
        filtered.error && typeof filtered.error === "object" && "code" in filtered.error
          ? (filtered.error as { code?: unknown }).code
          : undefined;

      if (errCode !== "PGRST204") throw filtered.error;

      const fallback = await supabase.from("recipes").update({ is_active: false }).eq("id", recipeId);
      if (fallback.error) throw fallback.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast({ title: "Recipe deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting recipe", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      output_quantity: "1",
      output_unit: "pcs",
      product_id: ""
    });
    setIngredients([]);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { warehouse_item_id: "", quantity_per_unit: "", unit: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill unit when item is selected
    if (field === "warehouse_item_id") {
      const item = warehouseItems?.find(w => w.id === value);
      if (item) {
        updated[index].unit = item.unit;
        updated[index].item_name = item.item_name;
      }
    }
    
    setIngredients(updated);
  };

  const totalRecipes = recipes?.length || 0;
  const totalIngredientsCost = recipes?.reduce((sum, r) => sum + (r.total_cost || 0), 0) || 0;

  return (
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Recipes (BOM)</h1>
              <p className="text-muted-foreground">Bill of Materials - Define product recipes</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Recipe
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Recipe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Recipe Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Chocolate Cake"
                      />
                    </div>
                    <div>
                      <Label>Link to Product (Optional)</Label>
                      <Select
                        value={formData.product_id}
                        onValueChange={(val) => setFormData({ ...formData, product_id: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Recipe description or notes..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Output Quantity *</Label>
                      <Input
                        type="number"
                        value={formData.output_quantity}
                        onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value })}
                        placeholder="How many units this recipe produces"
                      />
                    </div>
                    <div>
                      <Label>Output Unit</Label>
                      <Select
                        value={formData.output_unit}
                        onValueChange={(val) => setFormData({ ...formData, output_unit: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="batches">Batches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-base font-semibold">Ingredients</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Ingredient
                      </Button>
                    </div>

                    {ingredients.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                        No ingredients added. Click "Add Ingredient" to start.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {ingredients.map((ing, index) => (
                          <div key={index} className="flex gap-2 items-end p-3 border rounded-md bg-muted/30">
                            <div className="flex-1">
                              <Label className="text-xs">Material</Label>
                              <Select
                                value={ing.warehouse_item_id}
                                onValueChange={(val) => updateIngredient(index, "warehouse_item_id", val)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select material" />
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
                            <div className="w-24">
                              <Label className="text-xs">Qty/Unit</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={ing.quantity_per_unit}
                                onChange={(e) => updateIngredient(index, "quantity_per_unit", e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="w-20">
                              <Label className="text-xs">Unit</Label>
                              <Input
                                value={ing.unit}
                                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                                placeholder="kg"
                                disabled
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeIngredient(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {ingredients.length > 0 && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Estimated Total Cost:</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(calculateRecipeCost(ingredients), currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Cost per unit:</span>
                          <span>
                            {formatCurrency(
                              calculateRecipeCost(ingredients) / (parseFloat(formData.output_quantity) || 1),
                              currency
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => addRecipeMutation.mutate(formData)}
                    disabled={!formData.name || ingredients.length === 0 || addRecipeMutation.isPending}
                  >
                    {addRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Total Recipes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRecipes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Linked Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recipes?.filter(r => r.product_id).length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Avg Recipe Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalRecipes > 0 ? totalIngredientsCost / totalRecipes : 0, currency)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recipes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                All Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4 text-muted-foreground">Loading recipes...</p>
              ) : recipes?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No recipes created yet. Create your first recipe to define product ingredients.
                </p>
              ) : (
                <div className="space-y-4">
                  {recipes?.map((recipe) => (
                    <div key={recipe.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{recipe.name}</h3>
                          {recipe.description && (
                            <p className="text-sm text-muted-foreground">{recipe.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">
                              Output: {recipe.output_quantity} {recipe.output_unit}
                            </Badge>
                            {recipe.products && (
                              <Badge variant="outline">
                                Product: {recipe.products.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteRecipeMutation.mutate(recipe.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Ingredients:</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Material</TableHead>
                              <TableHead>Quantity per Unit</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recipe.recipe_ingredients?.map((ing: any) => (
                              <TableRow key={ing.id}>
                                <TableCell>{ing.factory_stock?.item_name || "Unknown"}</TableCell>
                                <TableCell>{ing.quantity_per_unit}</TableCell>
                                <TableCell>{ing.unit}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(ing.cost_per_ingredient || 0, currency)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-end gap-4 mt-3 pt-3 border-t">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Total Recipe Cost:</span>
                            <span className="font-bold ml-2">{formatCurrency(recipe.total_cost || 0, currency)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Cost per Unit:</span>
                            <span className="font-bold ml-2 text-primary">
                              {formatCurrency(recipe.cost_per_unit || 0, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
  );
};

const Recipes = () => (
  <ProtectedRoute requiredPermission="recipes.access">
    <Layout>
      <RecipesContent />
    </Layout>
  </ProtectedRoute>
);

export default Recipes;
