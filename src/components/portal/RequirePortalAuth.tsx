import { Navigate, Outlet } from "react-router-dom";
import { usePortalAuth } from "@/contexts/portal-auth";

const RequirePortalAuth = () => {
  const { user, loading } = usePortalAuth();

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground" role="status">Checking your sign-in…</main>;
  }

  return user ? <Outlet /> : <Navigate to="/portal" replace />;
};

export default RequirePortalAuth;
