import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Bell, Globe, LayoutGrid, LogOut, Menu, MessagesSquare, Receipt, Smartphone, Users, X } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get } from "@/utils/request";
import { playChatNotificationSound } from "@/utils/sound";

const NAV = [
  { to: "/admin/dashboard", label: "Akses Cepat", icon: LayoutGrid },
  { to: "/admin/transactions", label: "Riwayat Transaksi", icon: Receipt },
  { to: "/admin/notifications", label: "Notifikasi", icon: Bell },
  { to: "/admin/users", label: "Data Pengguna", icon: Users },
  { to: "/admin/settings", label: "Pengaturan URL Web", icon: Globe },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const prevUnreadRef = useRef(null);
  const { user, logout } = useAuth();
  const link = (active) => `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${active ? "bg-primary-700 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  useEffect(() => {
    const fetchUnread = () => {
      get(API_ENDPOINTS.ADMIN.CHAT.UNREAD)
        .then((res) => {
          const current = Number(res.data?.unread || 0);
          if (prevUnreadRef.current !== null && current > prevUnreadRef.current) {
            playChatNotificationSound();
          }
          prevUnreadRef.current = current;
          setUnreadChat(current);
        })
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-white p-5 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-none lg:ring-1 lg:ring-slate-100 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => link(isActive)}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-slate-100 pt-4">
          <Link to="/app" className={link(false)}><Smartphone className="h-5 w-5" />Lihat aplikasi</Link>
          <button onClick={logout} className={`${link(false)} w-full text-red-500`}><LogOut className="h-5 w-5" />Keluar</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 shrink-0" aria-label="Buka menu"><Menu className="h-6 w-6" /></button>
            <span className="font-extrabold text-slate-800 truncate">Admin · {user.name}</span>
          </div>
          {unreadChat > 0 && (
            <Link
              to="/admin/chat"
              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600 ring-1 ring-red-200 shrink-0"
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              <span>{unreadChat} Chat</span>
            </Link>
          )}
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet context={{ unreadChat }} /></main>
      </div>
    </div>
  );
}
