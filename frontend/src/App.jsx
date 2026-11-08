import { useEffect } from "react";
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
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get } from "@/utils/request";

export default function App() {
  useEffect(() => {
    // Cek domain aktif dari endpoint API settings saat inisialisasi aplikasi
    get(API_ENDPOINTS.SETTINGS.PUBLIC)
      .then((res) => {
        const rawTarget = res?.data?.web_app_url;
        if (!rawTarget || typeof rawTarget !== "string") return;

        const trimmed = rawTarget.trim();
        if (!trimmed) return;

        try {
          const targetUrl = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
          const currentHostname = window.location.hostname.toLowerCase();
          const targetHostname = targetUrl.hostname.toLowerCase();

          // Jangan redirect jika sedang development di localhost / IP lokal
          const isLocal = currentHostname === "localhost" || currentHostname === "127.0.0.1";
          if (isLocal) return;

          // Jika hostname domain saat ini berbeda dengan target domain aktif yang diset oleh Admin
          if (targetHostname && targetHostname !== currentHostname) {
            const targetOrigin = targetUrl.origin;
            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            const currentHash = window.location.hash;
            const destination = `${targetOrigin}${currentPath}${currentSearch}${currentHash}`;

            // Langsung alihkan pengunjung ke domain aktif tanpa meninggalkan history back loop
            window.location.replace(destination);
          }
        } catch (err) {
          console.warn("Gagal memproses validasi domain aktif:", err);
        }
      })
      .catch(() => {
        // Abaikan jika network error atau offline (agar PWA tetap dapat berjalan)
      });
  }, []);

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
