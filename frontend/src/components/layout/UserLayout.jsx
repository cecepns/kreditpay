import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, BellRing } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useFetch from "@/hooks/useFetch";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { syncExistingPushSubscription } from "@/utils/push";
import BottomNav from "@/components/layout/BottomNav";
import HelpButton from "@/components/layout/HelpButton";
import logoIcon from "@/assets/logo-icon.png";

const TITLES = { "/app/riwayat": "Riwayat Transaksi", "/app/notifikasi": "Notifikasi", "/app/akun": "Akun Saya" };

export default function UserLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data, reload: reloadNotifs } = useFetch(API_ENDPOINTS.NOTIFICATIONS.LIST, { limit: 10 });
  const title = TITLES[pathname];
  const hasNotif = (data?.pagination?.total || 0) > 0;
  const isPaylater = pathname.startsWith("/app/paylater");

  useEffect(() => {
    if (user?.id) {
      syncExistingPushSubscription();
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;
    const onSwMessage = (event) => {
      if (event?.data?.type !== "PUSH_RECEIVED") return;
      const n = event.data.notification || {};
      reloadNotifs();
      window.dispatchEvent(new CustomEvent("app-push-received", { detail: n }));
      toast(
        () => (
          <div className="flex items-start gap-2.5">
            <BellRing className="h-4 w-4 text-primary-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-800 line-clamp-1">{n.title || "Notifikasi Baru"}</p>
              {n.body && <p className="text-[11px] font-medium text-slate-600 line-clamp-2 mt-0.5">{n.body}</p>}
            </div>
          </div>
        ),
        { duration: 5000 }
      );
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [reloadNotifs]);

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
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-white/80">
                <img src={logoIcon} alt="Fastkredit" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/75">Selamat Datang,</p>
                <h1 className="text-lg font-extrabold uppercase tracking-wide leading-tight">{user.name}</h1>
              </div>
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
