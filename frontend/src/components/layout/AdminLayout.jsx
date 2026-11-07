import { useState, useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Bell, Landmark, Layers, LayoutGrid, LogOut, Menu, Receipt, Smartphone, Users, X, FileText, Sparkles, Settings, MessagesSquare } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get } from "@/utils/request";

const NAV = [
  { to: "/admin/dashboard", label: "Akses Cepat", icon: LayoutGrid },
  { to: "/admin/chat", label: "Live Chat CS", icon: MessagesSquare },
  { to: "/admin/promos", label: "Info & Promo", icon: Sparkles },
  { to: "/admin/paylater", label: "Pengajuan Pinjaman", icon: FileText },
  { to: "/admin/levels", label: "Master Level", icon: Layers },
  { to: "/admin/users", label: "Pengguna", icon: Users },
  { to: "/admin/banks", label: "Rekening Bank", icon: Landmark },
  { to: "/admin/transactions", label: "Transaksi", icon: Receipt },
  { to: "/admin/notifications", label: "Notifikasi", icon: Bell },
  { to: "/admin/settings", label: "Pengaturan & WA", icon: Settings },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const { user, logout } = useAuth();
  const link = (active) => `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${active ? "bg-primary-700 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  useEffect(() => {
    const fetchUnread = () => {
      get(API_ENDPOINTS.ADMIN.CHAT.UNREAD)
        .then((res) => setUnreadChat(res.data?.unread || 0))
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 10000);
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
              <Icon className="h-5 w-5" />
              <span className="flex-1">{label}</span>
              {to === "/admin/chat" && unreadChat > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {unreadChat}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-slate-100 pt-4">
          <Link to="/app" className={link(false)}><Smartphone className="h-5 w-5" />Lihat aplikasi</Link>
          <button onClick={logout} className={`${link(false)} w-full text-red-500`}><LogOut className="h-5 w-5" />Keluar</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Buka menu"><Menu className="h-6 w-6" /></button>
          <span className="font-extrabold text-slate-800">Admin · {user.name}</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
