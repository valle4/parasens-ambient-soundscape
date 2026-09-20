import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PortalLogin from "./pages/PortalLogin";
import PortalDashboard from "./pages/PortalDashboard";
import PortalNewRelease from "./pages/PortalNewRelease";
import PortalAuthConfirm from "./pages/PortalAuthConfirm";
import PortalAuthProvider from "./components/portal/PortalAuthProvider";
import RequirePortalAuth from "./components/portal/RequirePortalAuth";
import CustomCursor from "./components/CustomCursor";
import MouseSpotlight from "./components/MouseSpotlight";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Custom cursor */}
      <CustomCursor />
      
      {/* Mouse spotlight effect */}
      <MouseSpotlight />
      
      {/* Immersive background layers */}
      <div className="bg-orb-layer" />
      <div className="vignette" />
      
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/portal" element={<PortalAuthProvider />}>
            <Route index element={<PortalLogin />} />
            <Route path="login" element={<PortalLogin />} />
            <Route path="auth/confirm" element={<PortalAuthConfirm />} />
            <Route element={<RequirePortalAuth />}>
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="releases/new" element={<PortalNewRelease />} />
            </Route>
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
