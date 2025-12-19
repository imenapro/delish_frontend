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
import NotFound from "./pages/NotFound";
import PublicInvoice from "./pages/PublicInvoice";
import { TenantLayout } from "./components/TenantLayout";
import { TenantRoutes } from "./TenantRoutes";
import { isCustomDomain } from "./utils/domainMapping";

const queryClient = new QueryClient();

const App = () => {
  const isCustom = isCustomDomain(window.location.hostname);

  return (
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
              {isCustom ? (
                <>
                  <Route path="/login" element={<TenantAuth />} />
                  <Route path="/" element={<TenantLayout />}>
                    {TenantRoutes}
                  </Route>
                </>
              ) : (
                <>
                  <Route path="/:storeSlug/login" element={<TenantAuth />} />
                  <Route path="/:storeSlug" element={<TenantLayout />}>
                    {TenantRoutes}
                  </Route>
                </>
              )}
              
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
};

export default App;
