import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useAuth from "@/hooks/useAuth";

const Splash = () => <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace /> : children;
}
