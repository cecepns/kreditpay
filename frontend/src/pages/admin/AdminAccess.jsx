import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Search, ShieldAlert, UserCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import usePaginated from "@/hooks/usePaginated";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/StateViews";
import { USER_LEVELS } from "@/constants/levels";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";

const LEVEL_BADGE_CLASS = (lvl) => {
  if (lvl === 1) return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  if (lvl === 2) return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
  if (lvl === 3) return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  if (lvl === 4) return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  return "bg-purple-100 text-purple-700 ring-1 ring-purple-200";
};

const LEVEL_ACCESS_DESC = (lvl) => {
  if (lvl === 1) return "Semua fitur terkunci (Wajib Top Up)";
  if (lvl === 2) return "Transfer Autodebet & Pulsa Mode Pinjaman";
  if (lvl === 3) return "Transfer Tertunda (Verifikasi Asuransi)";
  return "Pindah Saldo Pinjaman (Dana Layanan Top Up)";
};

export default function AdminAccess() {
  const [levelFilter, setLevelFilter] = useState("");
  const usersList = usePaginated(API_ENDPOINTS.ADMIN.USERS.LIST, {
    initialLimit: 10,
    params: levelFilter ? { level: levelFilter } : {},
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [targetLevel, setTargetLevel] = useState(1);
  const [updatingUser, setUpdatingUser] = useState(false);

  const users = usersList.rows;

  const handleOpenLevelModal = (u) => {
    setSelectedUser(u);
    setTargetLevel(Number(u.level || 1));
  };

  const handleSaveLevel = async () => {
    if (!selectedUser) return;
    setUpdatingUser(true);
    try {
      const res = await put(API_ENDPOINTS.ADMIN.USERS.LEVEL(selectedUser.id), { level: targetLevel });
      toast.success(res.message || `Level user berhasil diubah ke Level ${targetLevel}`);
      setSelectedUser(null);
      usersList.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Ubah Akses</h1>
            <p className="text-xs font-black uppercase tracking-wider text-primary-700">
              Atur Level &amp; Hak Akses Pengguna
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700">
          <ShieldAlert className="h-4 w-4" />
          <span>Pengaturan Level Per Pengguna</span>
        </div>
      </div>

      {/* Daftar Pengguna & Action Ubah Akses */}
      <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">Daftar Pengguna &amp; Level Akses</h2>
            <p className="text-xs font-semibold text-slate-500">
              Pilih pengguna lalu ganti level akunnya untuk mengaktifkan atau membatasi akses fitur secara bertahap.
            </p>
          </div>
          <Link
            to="/admin/levels"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-black text-primary-700 hover:bg-primary-100 transition whitespace-nowrap"
          >
            Edit Teks Master Level &rarr;
          </Link>
        </div>

        {/* Pencarian Realtime (Debounce 300ms) & Filter Level */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={usersList.search}
              onChange={(e) => usersList.setSearch(e.target.value)}
              placeholder="Cari nama, username, email, no HP, ID akun..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none"
            />
            {usersList.search && (
              <button
                type="button"
                onClick={() => usersList.setSearch("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              usersList.setPage(1);
            }}
            className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-extrabold text-slate-700 focus:border-primary-500 focus:bg-white focus:outline-none"
          >
            <option value="">Semua Level</option>
            {USER_LEVELS.map((lvlItem) => (
              <option key={lvlItem.level} value={String(lvlItem.level)}>
                Level {lvlItem.level} ({lvlItem.subtitle})
              </option>
            ))}
          </select>
        </div>

        {usersList.error ? (
          <ErrorState message={usersList.error} onRetry={usersList.reload} />
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="space-y-3 sm:hidden">
              {usersList.loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
              {!usersList.loading && users.length === 0 && (
                <EmptyState text={usersList.search || levelFilter ? "Pengguna tidak ditemukan" : "Belum ada data pengguna"} />
              )}
              {!usersList.loading &&
                users.map((u) => {
                  const lvl = Number(u.level || 1);
                  return (
                    <div
                      key={u.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{u.name}</p>
                          <p className="text-xs text-slate-400 font-semibold">
                            @{u.username} · <span className="uppercase text-[11px] font-black">{u.role}</span>
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${LEVEL_BADGE_CLASS(lvl)}`}>
                          Level {lvl}
                        </span>
                      </div>

                      <div className="rounded-xl bg-white p-2.5 text-xs font-semibold text-slate-600 border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                          Status Akses Transaksi:
                        </span>
                        {LEVEL_ACCESS_DESC(lvl)}
                      </div>

                      <div className="pt-1">
                        <Button
                          size="sm"
                          variant="soft"
                          icon={UserCheck}
                          onClick={() => handleOpenLevelModal(u)}
                          className="w-full text-xs font-bold justify-center"
                        >
                          Ubah Level
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Desktop / Tablet Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-extrabold uppercase text-slate-400">
                  <tr>
                    <th className="pb-3 pl-3">Nama &amp; Username</th>
                    <th className="pb-3 whitespace-nowrap">Level Saat Ini</th>
                    <th className="pb-3">Status Akses Transaksi</th>
                    <th className="pb-3 text-right pr-3 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {usersList.loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="py-3">
                          <Skeleton className="h-9" />
                        </td>
                      </tr>
                    ))}
                  {!usersList.loading && users.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState text={usersList.search || levelFilter ? "Pengguna tidak ditemukan" : "Belum ada data pengguna"} />
                      </td>
                    </tr>
                  )}
                  {!usersList.loading &&
                    users.map((u) => {
                      const lvl = Number(u.level || 1);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 pl-3">
                            <p className="font-extrabold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-400">@{u.username} · {u.role}</p>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${LEVEL_BADGE_CLASS(lvl)}`}>
                              Level {lvl}
                            </span>
                          </td>
                          <td className="py-3.5 text-xs text-slate-500 max-w-xs">
                            {LEVEL_ACCESS_DESC(lvl)}
                          </td>
                          <td className="py-3.5 text-right pr-3 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="soft"
                              icon={UserCheck}
                              onClick={() => handleOpenLevelModal(u)}
                              className="whitespace-nowrap"
                            >
                              Ubah Level
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-1 sm:px-2 pt-1">
              <Pagination
                pagination={usersList.pagination}
                onPage={usersList.setPage}
                limit={usersList.limit}
                onLimit={usersList.setLimit}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal Ubah Level Pengguna */}
      <Modal
        open={!!selectedUser}
        onClose={() => !updatingUser && setSelectedUser(null)}
        title={`Ubah Level: ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600">
            Pilih level yang akan diterapkan pada akun <b>@{selectedUser?.username}</b>:
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {USER_LEVELS.map((item) => (
              <button
                key={item.level}
                type="button"
                onClick={() => setTargetLevel(item.level)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                  targetLevel === item.level
                    ? "border-primary-600 bg-primary-50/70 ring-1 ring-primary-600"
                    : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div>
                  <p className="font-extrabold text-slate-900">{item.title} — {item.subtitle}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.description}</p>
                </div>
                {targetLevel === item.level && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-600 text-white shrink-0">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setSelectedUser(null)} disabled={updatingUser}>
              Batal
            </Button>
            <Button loading={updatingUser} onClick={handleSaveLevel}>
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

