import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BellRing,
  Globe,
  Megaphone,
  Pencil,
  Plus,
  Radio,
  Search,
  Send,
  Smartphone,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import useFetch from "@/hooks/useFetch";
import usePaginated from "@/hooks/usePaginated";
import DataTable from "@/components/admin/DataTable";
import BroadcastModal from "@/components/admin/BroadcastModal";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/StateViews";
import { confirmToast } from "@/utils/confirm";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatDateTime } from "@/utils/format";
import { del, post } from "@/utils/request";

const E = API_ENDPOINTS.ADMIN.NOTIFICATIONS;

const CHANNEL_BADGE = {
  both: { label: "Web + Push", cls: "bg-primary-50 text-primary-700 ring-1 ring-primary-200/70", icon: Radio },
  push: { label: "Push Saja", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70", icon: BellRing },
  web: { label: "Web Saja", cls: "bg-slate-100 text-slate-600", icon: Globe },
};

function ChannelPill({ channel }) {
  const cfg = CHANNEL_BADGE[channel] || CHANNEL_BADGE.web;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function TargetSummary({ row }) {
  if (row.target_type === "single" || (!row.target_type && row.user_id)) {
    const label = row.target_user_name
      ? `${row.target_user_name}${row.target_username ? ` (@${row.target_username})` : ""}`
      : `User #${row.user_id}`;
    return (
      <span
        title={label}
        className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700"
      >
        <UserCheck className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (row.target_type === "multiple") {
    const count = Number(row.target_count || 0);
    return (
      <span
        title={row.target_users_label || `${count} user`}
        className="inline-flex max-w-[190px] items-center gap-1 truncate rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"
      >
        <Users className="h-3 w-3 shrink-0" />
        <span className="truncate">{count} User Terpilih</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
      <Users className="h-3 w-3" />
      Semua User
    </span>
  );
}

export default function AdminNotifications() {
  const [channelFilter, setChannelFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "create" | "edit", item?: row }
  const [resendingId, setResendingId] = useState(null);

  const queryParams = useMemo(
    () => ({
      channel: channelFilter || undefined,
      target_type: targetFilter || undefined,
    }),
    [channelFilter, targetFilter]
  );

  const list = usePaginated(E.LIST, { params: queryParams });
  const { data: statsRes, reload: reloadStats } = useFetch(API_ENDPOINTS.ADMIN.PUSH.STATS);
  const stats = statsRes?.data || { totalDevices: 0, subscribedUsers: 0, totalActiveUsers: 0 };

  const reloadAll = () => {
    list.reload();
    reloadStats();
  };

  const handleResendPush = async (row) => {
    const yes = await confirmToast({
      title: "Kirim ulang Web Push?",
      message: `"${row.title}" akan dikirim ke perangkat target yang mengaktifkan push notification.`,
      confirmText: "Kirim Push",
      variant: "primary",
    });
    if (!yes) return;

    setResendingId(row.id);
    try {
      const res = await post(E.RESEND_PUSH(row.id));
      toast.success(res.message || "Push berhasil dikirim ulang");
      reloadAll();
    } catch (err) {
      toast.error(err.message || "Gagal mengirim ulang push");
    } finally {
      setResendingId(null);
    }
  };

  const handleRemove = async (row) => {
    const yes = await confirmToast({
      title: "Hapus broadcast ini?",
      message: "Riwayat notifikasi akan dihapus dan tidak lagi tampil di sisi user.",
      confirmText: "Ya, hapus",
    });
    if (!yes) return;

    try {
      await toast.promise(del(E.DETAIL(row.id)), {
        loading: "Menghapus...",
        success: (r) => r.message || "Broadcast dihapus",
        error: (e) => e.message,
      });
      if (list.rows.length === 1 && list.page > 1) list.setPage(list.page - 1);
      else list.reload();
    } catch {
      // ditangani toast.promise
    }
  };

  const columns = [
    {
      key: "title",
      label: "Judul & Pesan",
      sortable: true,
      render: (r) => (
        <div className="max-w-xs whitespace-normal">
          <p className="font-extrabold text-slate-800 line-clamp-1">{r.title}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500 line-clamp-2">{r.body}</p>
        </div>
      ),
    },
    {
      key: "channel",
      label: "Mode",
      render: (r) => <ChannelPill channel={r.channel} />,
    },
    {
      key: "target_type",
      label: "Target",
      render: (r) => <TargetSummary row={r} />,
    },
    {
      key: "push_sent",
      label: "Terkirim Push",
      sortable: true,
      render: (r) =>
        r.channel === "web" && Number(r.push_sent || 0) === 0 ? (
          <span className="text-xs font-medium text-slate-400">-</span>
        ) : (
          <span className="text-xs font-bold text-emerald-700">
            {Number(r.push_sent || 0)} perangkat
            {Number(r.push_failed || 0) > 0 && (
              <span className="ml-1 text-[11px] font-semibold text-amber-600">
                ({r.push_failed} gagal)
              </span>
            )}
          </span>
        ),
    },
    {
      key: "created_at",
      label: "Dikirim",
      sortable: true,
      render: (r) => <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span>,
    },
  ];

  const renderActions = (row) => (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleResendPush(row)}
        disabled={resendingId === row.id}
        title="Kirim Ulang Push Notification"
        aria-label="Kirim Ulang Push"
        className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setModal({ mode: "edit", item: row })}
        title="Edit Notifikasi"
        aria-label="Edit"
        className="rounded-xl p-2 text-primary-700 hover:bg-primary-50"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => handleRemove(row)}
        title="Hapus"
        aria-label="Hapus"
        className="rounded-xl p-2 text-red-500 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Broadcast &amp; Push Notification</h1>
          <p className="text-sm font-semibold text-slate-500">
            Kirim notifikasi di dalam web dan popup Native Web Push ke semua user, 1 user, atau beberapa user.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModal({ mode: "create" })}>
          Buat Broadcast
        </Button>
      </div>

      {/* Ringkasan Statistik Push */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Perangkat Push Aktif</p>
            <p className="text-xl font-black text-slate-800">{stats.totalDevices}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">User Mengaktifkan Push</p>
            <p className="text-xl font-black text-primary-700">{stats.subscribedUsers}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Total User Aktif</p>
            <p className="text-xl font-black text-slate-800">{stats.totalActiveUsers}</p>
          </div>
        </div>
      </div>

      {/* Card Tabel & Filter */}
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Cari judul, pesan, atau username..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-primary-500 focus:outline-none"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              list.setPage(1);
            }}
            aria-label="Filter mode pengiriman"
            className="rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">Semua Mode</option>
            <option value="both">Web + Push</option>
            <option value="web">Web Saja</option>
            <option value="push">Push Saja</option>
          </select>

          <select
            value={targetFilter}
            onChange={(e) => {
              setTargetFilter(e.target.value);
              list.setPage(1);
            }}
            aria-label="Filter target penerima"
            className="rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">Semua Target</option>
            <option value="all">Semua User</option>
            <option value="single">1 User Tertentu</option>
            <option value="multiple">Beberapa User</option>
          </select>
        </div>

        {/* Desktop & Tablet Table */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            rows={list.rows}
            loading={list.loading}
            error={list.error}
            onRetry={list.reload}
            sort={list.sort}
            onSort={list.toggleSort}
            actions={renderActions}
          />
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden divide-y divide-slate-100 px-4 pb-2">
          {list.loading ? (
            <div className="py-3"><ListSkeleton rows={4} /></div>
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : list.rows.length === 0 ? (
            <EmptyState icon={Megaphone} text="Belum ada data broadcast." />
          ) : (
            list.rows.map((r) => (
              <div key={r.id} className="space-y-2.5 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-slate-800">{r.title}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600 line-clamp-2">{r.body}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChannelPill channel={r.channel} />
                  <TargetSummary row={r} />
                  {Number(r.push_sent || 0) > 0 && (
                    <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {r.push_sent} perangkat
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {formatDateTime(r.created_at)}
                  </span>
                  {renderActions(r)}
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          pagination={list.pagination}
          onPage={list.setPage}
          limit={list.limit}
          onLimit={list.setLimit}
        />
      </div>

      <BroadcastModal
        open={Boolean(modal)}
        mode={modal?.mode || "create"}
        initialItem={modal?.item || null}
        onClose={() => setModal(null)}
        onSaved={reloadAll}
      />
    </div>
  );
}
