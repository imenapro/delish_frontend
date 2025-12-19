import { Route, Routes, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MyStores from "./pages/MyStores";
import CreateFirstShop from "./pages/CreateFirstShop";
import SuperAdmin from "./pages/SuperAdmin";
import TenantAuth from "./pages/TenantAuth";
import TenantDashboard from "./pages/TenantDashboard";
import NotFound from "./pages/NotFound";
import PublicInvoice from "./pages/PublicInvoice";
import { TenantLayout } from "./components/TenantLayout";
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

export function AppRoutes() {
  const hostname = window.location.hostname;
  const platformDomains = ['dev.delish.rw', 'localhost', '127.0.0.1'];
  const isPlatformDomain = platformDomains.some(d => hostname === d || hostname.endsWith('.ondigitalocean.app'));
  const isCustomDomain = !isPlatformDomain;

  if (isCustomDomain) {
    return (
      <Routes>
        <Route element={<TenantLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<TenantAuth />} />
          <Route path="/dashboard" element={<TenantDashboard />} />
          <Route path="/pos" element={<TenantPOS />} />
          <Route path="/shifts" element={<TenantShiftManagement />} />
          <Route path="/invoices" element={<TenantInvoiceManagement />} />
          <Route path="/shops" element={<TenantShops />} />
          <Route path="/products" element={<TenantProducts />} />
          <Route path="/orders" element={<TenantOrders />} />
          <Route path="/kitchen" element={<TenantKitchen />} />
          <Route path="/inventory" element={<TenantInventory />} />
          <Route path="/finance" element={<TenantFinance />} />
          <Route path="/workforce" element={<TenantWorkforce />} />
          <Route path="/reports" element={<TenantReports />} />
          <Route path="/delivery" element={<TenantDelivery />} />
          <Route path="/staff" element={<TenantStaff />} />
          <Route path="/admin" element={<TenantAdmin />} />
          <Route path="/chat" element={<TenantChat />} />
          <Route path="/wallet" element={<TenantWallet />} />
        </Route>
        {/* Public Invoice Route - available on custom domain too */}
        <Route path="/i/:shortId" element={<PublicInvoice />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Landing />} />
      
      {/* Registration */}
      <Route path="/register" element={<Register />} />
      
      {/* My Stores Selection */}
      <Route path="/my-stores" element={<MyStores />} />
      
      {/* Create First Shop */}
      <Route path="/create-first-shop" element={<CreateFirstShop />} />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<SuperAdmin />} />
      
      {/* Multi-Tenant Routes */}
      <Route path="/:storeSlug/login" element={<TenantAuth />} />
      <Route path="/:storeSlug" element={<TenantLayout />}>
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
      </Route>
      
      {/* Legacy Routes (keeping for backward compatibility) */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Index />} />
      
      {/* Catch-all 404 */}
      <Route path="/i/:shortId" element={<PublicInvoice />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
