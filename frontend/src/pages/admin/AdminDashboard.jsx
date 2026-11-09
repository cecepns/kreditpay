import { Link, useOutletContext } from "react-router-dom";
import {
  FileText,
  IdCard,
  Landmark,
  Layers,
  MessageSquare,
  MessagesSquare,
  Radio,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
  Zap,
  Sparkles,
  Settings,
} from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function AdminDashboard() {
  const outletCtx = useOutletContext() || {};
  const unreadChat = Number(outletCtx.unreadChat || 0);
  const { data: usersData } = useFetch(API_ENDPOINTS.ADMIN.USERS.LIST);
  const { data: txData } = useFetch(API_ENDPOINTS.ADMIN.TRANSACTIONS.LIST);
  const { data: settingsData } = useFetch(API_ENDPOINTS.SETTINGS.PUBLIC);

  const usersCount = usersData?.pagination?.total || 0;
  const txCount = txData?.pagination?.total || 0;
  const waUrl = settingsData?.data?.whatsapp_url || "https://wa.me/6281200000000";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Akses Cepat</h1>
        <p className="text-sm font-semibold text-slate-500">
          Pintasan kontrol panel, pengajuan pengguna, dan editor level aplikasi.
        </p>
      </div>

      {/* Ringkasan Ringkas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-400">Total Pengguna</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{usersCount}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-400">Total Transaksi</p>
          <p className="mt-1 text-2xl font-black text-primary-700">{txCount}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-400">Sistem Level</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">7 Level</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-400">Mode Sistem</p>
          <p className="mt-1 text-2xl font-black text-amber-600">Manual / Auto</p>
        </div>
      </div>

      {/* GAMBAR 3 - Section 1: Menu Pengajuan */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-primary-700" />
          <h2 className="text-base font-extrabold text-slate-900">Menu Pengajuan</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            to="/admin/paylater"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-600 transition group-hover:scale-110">
              <Wallet className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Pengajuan Saldo</p>
          </Link>

          <Link
            to="/admin/paylater"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:scale-110">
              <FileText className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Pengajuan Pinjaman</p>
          </Link>
        </div>
      </section>

      {/* GAMBAR 3 - Section 2: Menu Akses Cepat */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-primary-700" />
          <h2 className="text-base font-extrabold text-slate-900">Menu Akses Cepat</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            to="/admin/levels"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:scale-110">
              <ShieldAlert className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Ubah Akses</p>
          </Link>

          <Link
            to="/admin/banks"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:scale-110">
              <IdCard className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Ubah ID User</p>
          </Link>

          <Link
            to="/admin/users"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 transition group-hover:scale-110">
              <UserCheck className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Ubah Status</p>
          </Link>

          <Link
            to="/admin/users"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 transition group-hover:scale-110">
              <Zap className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Tindakan Cepat</p>
          </Link>
        </div>
      </section>

      {/* GAMBAR 3 - Section 3: Master Editor */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-primary-700" />
          <h2 className="text-base font-extrabold text-slate-900">Master Editor &amp; Pengaturan</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            to="/admin/promos"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:scale-110">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Info &amp; Promo</p>
          </Link>

          <Link
            to="/admin/levels"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-purple-50 text-purple-600 transition group-hover:scale-110">
              <Layers className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Master Level</p>
          </Link>

          <Link
            to="/admin/users"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-110">
              <Users className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">User</p>
          </Link>

          <Link
            to="/admin/banks"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-600 transition group-hover:scale-110">
              <Landmark className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Rekening Bank</p>
          </Link>

          <Link
            to="/admin/settings"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:scale-110">
              <Settings className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Pengaturan &amp; WA</p>
          </Link>
        </div>
      </section>

      {/* GAMBAR 3 - Section 4: Fitur Lainnya */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-primary-700" />
          <h2 className="text-base font-extrabold text-slate-900">Fitur Lainnya</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            to="/admin/chat"
            className="relative group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            {unreadChat > 0 && (
              <span className="absolute top-3 right-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                {unreadChat} baru
              </span>
            )}
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600 transition group-hover:scale-110">
              <MessagesSquare className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Live Chat CS</p>
          </Link>

          <button
            type="button"
            onClick={() => window.open(waUrl, "_blank")}
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:scale-110">
              <MessageSquare className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">WhatsApp CS</p>
          </button>

          <Link
            to="/admin/notifications"
            className="group flex flex-col items-center justify-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-pink-600 transition group-hover:scale-110">
              <Radio className="h-7 w-7" />
            </span>
            <p className="mt-3 text-xs font-extrabold text-slate-800">Broadcast</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

