import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StoreProvider } from "@/contexts/StoreContext";
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

// Tenant pages
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
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
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
