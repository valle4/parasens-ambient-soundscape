import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NotFound from "./pages/NotFound";
import PortalLogin from "./pages/PortalLogin";

import PortalAuthProvider from "./components/portal/PortalAuthProvider";
import RequirePortalAuth from "./components/portal/RequirePortalAuth";
import CustomCursor from "./components/CustomCursor";
import MouseSpotlight from "./components/MouseSpotlight";

import { lazy, Suspense } from "react";
const Index = lazy(() => import("./pages/Index"));
const PortalDashboard = lazy(() => import("./pages/PortalDashboard"));
const PortalNewRelease = lazy(() => import("./pages/PortalNewRelease"));
const PortalAuthConfirm = lazy(() => import("./pages/PortalAuthConfirm"));
const PortalSpotifyCallback = lazy(
  () => import("./pages/PortalSpotifyCallback"),
);
const PortalMusicLibrary = lazy(() => import("./pages/PortalMusicLibrary"));

import RequireMusicAdmin from "./components/portal/RequireMusicAdmin";

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
        <Suspense
          fallback={
            <main
              role="status"
              className="min-h-screen grid place-items-center"
            >
              Loading…
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/portal" element={<PortalAuthProvider />}>
              <Route index element={<PortalLogin />} />
              <Route path="login" element={<PortalLogin />} />
              <Route path="auth/confirm" element={<PortalAuthConfirm />} />
              <Route element={<RequirePortalAuth />}>
                <Route path="dashboard" element={<PortalDashboard />} />
                <Route path="releases/new" element={<PortalNewRelease />} />
                <Route element={<RequireMusicAdmin />}>
                  <Route
                    path="music"
                    element={
                      <Suspense
                        fallback={
                          <main className="min-h-screen grid place-items-center">
                            Loading Music Library…
                          </main>
                        }
                      >
                        <PortalMusicLibrary />
                      </Suspense>
                    }
                  />
                  <Route
                    path="music/spotify/callback"
                    element={<PortalSpotifyCallback />}
                  />
                </Route>
              </Route>
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
