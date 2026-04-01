import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StoreProvider } from "@/contexts/StoreContext";
import { UIPersistenceProvider } from "@/contexts/ui-persistence-context";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/auth/ResetPassword";
import SuperAdmin from "./pages/SuperAdmin";
import TenantAuth from "./pages/TenantAuth";
import NotFound from "./pages/NotFound";
import PublicInvoice from "./pages/PublicInvoice";
import { TenantLayout } from "./components/TenantLayout";
import { FaviconManager } from "@/components/FaviconManager";
import { TenantRoutes } from "./TenantRoutes";
import { isCustomDomain } from "./utils/domainMapping";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => {
  const isCustom = isCustomDomain(window.location.hostname);

  return (
  <QueryClientProvider client={queryClient}>
    <UIPersistenceProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <FaviconManager />
            <Routes>
              {/* Public Invoice Route - Accessible on all domains */}
              <Route path="/i/:shortId" element={<PublicInvoice />} />

              {isCustom ? (
                /* ------------------------------------------------------------------
                   TENANT CONTEXT (Custom Domain)
                   e.g. delish.rw
                   ------------------------------------------------------------------ */
                <>
                  <Route path="/login" element={<TenantAuth />} />
                  <Route path="/" element={<TenantLayout />}>
                    {TenantRoutes}
                  </Route>
                  {/* Catch-all for tenant domain */}
                  <Route path="*" element={<NotFound />} />
                </>
              ) : (
                /* ------------------------------------------------------------------
                   GLOBAL CONTEXT (Main Domain)
                   e.g. dev.delish.rw
                   ------------------------------------------------------------------ */
                <>
                  {/* Landing Page */}
                  <Route path="/" element={<Landing />} />
                  
                  {/* Registration */}
                  <Route path="/register" element={<Register />} />
                  
                  {/* Password Reset */}
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Super Admin Routes */}
                  <Route path="/super-admin" element={<SuperAdmin />} />
                  
                  {/* Multi-Tenant Routes (Subpath) */}
                  <Route path="/:storeSlug/login" element={<TenantAuth />} />
                  <Route path="/:storeSlug" element={<TenantLayout />}>
                    {TenantRoutes}
                  </Route>
                  
                  {/* Legacy Routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Index />} />
                  
                  {/* Catch-all 404 */}
                  <Route path="*" element={<NotFound />} />
                </>
              )}
            </Routes>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </UIPersistenceProvider>
  </QueryClientProvider>
);
};

export default App;
