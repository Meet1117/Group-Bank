import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "./Layout";
import Spinner from "./ui/Spinner";
import Logo from "./Logo";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
        <Logo />
        <Spinner size={32} className="text-brand-600" />
      </div>
    );
  }

  if (!user) {
    // Remember where they were headed (e.g. an invite link) so we can
    // send them back there after they sign in.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
