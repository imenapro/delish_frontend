import React from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TenantDashboard from "./pages/TenantDashboard";
import { WarehouseContent } from "./pages/Warehouse";
import { StockReportsContent } from "./pages/StockReports";
import { RecipesContent } from "./pages/Recipes";
import { ProductionStockContent } from "./pages/ProductionStock";
import { FinishedProductsContent } from "./pages/FinishedProducts";
import { SuppliersContent } from "./pages/Suppliers";
import {
  TenantPOS,
  TenantShops,
  TenantProducts,
  TenantOrders,
  TenantKitchen,
  TenantInventory,
  TenantFinance,
  TenantWorkforce,
  TenantReports,
  TenantDelivery,
  TenantStaff,
  TenantAdmin,
  TenantChat,
  TenantWallet,
  TenantShiftManagement,
  TenantInvoiceManagement,
  TenantInvoiceSettingsPage,
  InventorySettings,
  TenantProfile,
} from "./pages/tenant";

export const TenantRoutes = (
  <>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<TenantDashboard />} />
    <Route path="profile" element={<TenantProfile />} />
    <Route
      path="pos"
      element={
        <ProtectedRoute requiredPermission="pos.access">
          <TenantPOS />
        </ProtectedRoute>
      }
    />
    <Route path="shifts" element={<TenantShiftManagement />} />
    <Route path="invoices" element={<TenantInvoiceManagement />} />
    <Route
      path="invoices/settings"
      element={
        <ProtectedRoute requiredRoles={['admin', 'store_owner', 'super_admin']}>
          <TenantInvoiceSettingsPage />
        </ProtectedRoute>
      }
    />
    <Route path="shops" element={<TenantShops />} />
    <Route path="products" element={<TenantProducts />} />
    <Route path="orders" element={<TenantOrders />} />
    <Route path="kitchen" element={<TenantKitchen />} />
    <Route path="inventory" element={<TenantInventory />} />
    <Route path="inventory/settings" element={<InventorySettings />} />
    <Route path="finance" element={<TenantFinance />} />
    <Route path="workforce" element={<TenantWorkforce />} />
    <Route path="reports" element={<TenantReports />} />
    <Route path="delivery" element={<TenantDelivery />} />
    <Route path="staff" element={<TenantStaff />} />
    <Route path="admin" element={<TenantAdmin />} />
    <Route path="chat" element={<TenantChat />} />
    <Route path="wallet" element={<TenantWallet />} />
    <Route
      path="warehouse"
      element={
        <ProtectedRoute requiredPermission="warehouse.access">
          <WarehouseContent />
        </ProtectedRoute>
      }
    />
    <Route
      path="suppliers"
      element={
        <ProtectedRoute requiredPermission="suppliers.access">
          <SuppliersContent />
        </ProtectedRoute>
      }
    />
    <Route
      path="recipes"
      element={
        <ProtectedRoute requiredPermission="recipes.access">
          <RecipesContent />
        </ProtectedRoute>
      }
    />
    <Route
      path="production-stock"
      element={
        <ProtectedRoute requiredPermission="production_stock.access">
          <ProductionStockContent />
        </ProtectedRoute>
      }
    />
    <Route
      path="finished-products"
      element={
        <ProtectedRoute requiredPermission="finished_products.access">
          <FinishedProductsContent />
        </ProtectedRoute>
      }
    />
    <Route
      path="stock-reports"
      element={
        <ProtectedRoute requiredPermission="stock_reports.access">
          <StockReportsContent />
        </ProtectedRoute>
      }
    />
  </>
);
