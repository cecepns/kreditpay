import { Link, Outlet, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useFetch from "@/hooks/useFetch";
import { API_ENDPOINTS } from "@/utils/endpoints";
import BottomNav from "@/components/layout/BottomNav";
import HelpButton from "@/components/layout/HelpButton";

const TITLES = { "/app/riwayat": "Riwayat Transaksi", "/app/notifikasi": "Notifikasi", "/app/akun": "Akun Saya" };

export default function UserLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data } = useFetch(API_ENDPOINTS.NOTIFICATIONS.LIST, { limit: 10 });
  const title = TITLES[pathname];
  const hasNotif = (data?.pagination?.total || 0) > 0;
  const isPaylater = pathname.startsWith("/app/paylater");

  if (isPaylater) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="relative mx-auto min-h-screen max-w-xl bg-white shadow-xl flex flex-col justify-between">
          <Outlet />
          <HelpButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative mx-auto min-h-screen max-w-xl bg-slate-50 pb-44 shadow-xl">
        <header className={`rounded-b-[2.5rem] bg-gradient-to-br from-primary-700 to-primary-900 px-6 pt-8 text-white ${title ? "pb-16" : "pb-32"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/80">Selamat Datang,</p>
              <h1 className="text-xl font-extrabold uppercase tracking-wide">{user.name}</h1>
            </div>
            <Link to="/app/notifikasi" aria-label="Notifikasi" className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <Bell className="h-6 w-6" fill="currentColor" />
              {hasNotif && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-primary-700" />}
            </Link>
          </div>
          {title && <h2 className="mt-10 text-3xl font-extrabold">{title}</h2>}
        </header>
        <main className={`relative px-4 ${title ? "-mt-8" : "-mt-24"}`}><Outlet /></main>
        <HelpButton />
        <BottomNav />
      </div>
    </div>
  );
}
