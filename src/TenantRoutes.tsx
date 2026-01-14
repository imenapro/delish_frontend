import React from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TenantDashboard from "./pages/TenantDashboard";
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
<<<<<<< HEAD
  InvoiceSettings,
=======
  TenantInvoiceSettingsPage,
>>>>>>> development
  InventorySettings,
  TenantProfile,
} from "./pages/tenant";

export const TenantRoutes = (
  <>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<TenantDashboard />} />
    <Route path="profile" element={<TenantProfile />} />
    <Route path="pos" element={<TenantPOS />} />
    <Route path="shifts" element={<TenantShiftManagement />} />
    <Route path="invoices" element={<TenantInvoiceManagement />} />
<<<<<<< HEAD
    <Route path="invoices/settings" element={<InvoiceSettings />} />
=======
    <Route path="invoices/settings" element={
      <ProtectedRoute requiredRoles={['admin', 'store_owner', 'super_admin']}>
        <TenantInvoiceSettingsPage />
      </ProtectedRoute>
    } />
>>>>>>> development
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
  </>
);
