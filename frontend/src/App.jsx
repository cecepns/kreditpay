import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute } from "@/components/layout/ProtectedRoute";
import UserLayout from "@/components/layout/UserLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Notifications from "@/pages/Notifications";
import Account from "@/pages/Account";
import PayLaterApplication from "@/pages/PayLaterApplication";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLevels from "@/pages/admin/AdminLevels";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminBanks from "@/pages/admin/AdminBanks";
import AdminPayLater from "@/pages/admin/AdminPayLater";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminPromos from "@/pages/admin/AdminPromos";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminChat from "@/pages/admin/AdminChat";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      <Route path="/app" element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="riwayat" element={<History />} />
        <Route path="notifikasi" element={<Notifications />} />
        <Route path="akun" element={<Account />} />
        <Route path="paylater" element={<PayLaterApplication />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="paylater" element={<AdminPayLater />} />
        <Route path="levels" element={<AdminLevels />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="banks" element={<AdminBanks />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="promos" element={<AdminPromos />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
