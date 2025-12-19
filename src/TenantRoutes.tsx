import React from "react";
import { Route, Navigate } from "react-router-dom";
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
} from "./pages/tenant";

export const TenantRoutes = (
  <>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<TenantDashboard />} />
    <Route path="pos" element={<TenantPOS />} />
    <Route path="shifts" element={<TenantShiftManagement />} />
    <Route path="invoices" element={<TenantInvoiceManagement />} />
    <Route path="shops" element={<TenantShops />} />
    <Route path="products" element={<TenantProducts />} />
    <Route path="orders" element={<TenantOrders />} />
    <Route path="kitchen" element={<TenantKitchen />} />
    <Route path="inventory" element={<TenantInventory />} />
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
