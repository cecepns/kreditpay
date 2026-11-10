import { useMemo, useState } from "react";
import { BellRing, Check, ChevronLeft, ChevronRight, Search, UserCheck, Users, X } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function UserRecipientPicker({ mode = "multiple", selectedIds = [], onChange, error }) {
  const list = usePaginated(API_ENDPOINTS.ADMIN.USERS.LIST, { initialLimit: 10 });
  const [selectedMap, setSelectedMap] = useState({});

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleUser = (user) => {
    setSelectedMap((prev) => ({ ...prev, [user.id]: user }));

    if (mode === "single") {
      onChange([user.id]);
      return;
    }

    if (selectedSet.has(user.id)) {
      onChange(selectedIds.filter((id) => id !== user.id));
    } else {
      onChange([...selectedIds, user.id]);
    }
  };

  const removeSelected = (id) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedUsers = selectedIds.map((id) => {
    const cached = selectedMap[id] || list.rows.find((r) => r.id === id);
    return cached || { id, name: `User #${id}`, username: "", push_count: 0 };
  });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">
          {mode === "single" ? <UserCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
          {mode === "single" ? "Pilih 1 User Tujuan" : "Pilih Beberapa User Tujuan"}
        </span>
        <span className="text-xs font-bold text-primary-700">
          {selectedIds.length} user dipilih
        </span>
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-primary-50/70 p-2.5 ring-1 ring-primary-200/70">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-xs ring-1 ring-primary-200/80"
            >
              <span className="max-w-[160px] truncate">{u.name}</span>
              {u.username && <span className="text-[11px] font-semibold text-slate-400">@{u.username}</span>}
              <button
                type="button"
                onClick={() => removeSelected(u.id)}
                aria-label={`Hapus ${u.name}`}
                className="rounded-md p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {mode === "multiple" && selectedUsers.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto rounded-lg px-2 py-1 text-[11px] font-extrabold text-red-600 hover:bg-red-50"
            >
              Reset Pilihan
            </button>
          )}
        </div>
      )}

      <div
        className={`overflow-hidden rounded-2xl border bg-white ${
          error ? "border-red-400" : "border-slate-200"
        }`}
      >
        <div className="relative border-b border-slate-100 bg-slate-50/70 p-2.5">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            placeholder="Cari nama, username, email, atau No HP..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
          {list.loading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : list.error ? (
            <div className="p-4 text-center text-xs font-semibold text-red-500">
              {list.error}
            </div>
          ) : list.rows.length === 0 ? (
            <div className="p-5 text-center text-xs font-semibold text-slate-400">
              Pengguna tidak ditemukan.
            </div>
          ) : (
            list.rows.map((u) => {
              const checked = selectedSet.has(u.id);
              const hasPush = Number(u.push_count || 0) > 0;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${
                    checked ? "bg-primary-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center border transition ${
                      mode === "single" ? "rounded-full" : "rounded-md"
                    } ${
                      checked
                        ? "border-primary-700 bg-primary-700 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-extrabold text-slate-800">{u.name}</span>
                      {u.role === "admin" && (
                        <span className="rounded-md bg-primary-100 px-1.5 py-0.5 text-[10px] font-extrabold text-primary-700">
                          Admin
                        </span>
                      )}
                      {Boolean(u.is_blocked) && (
                        <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-700">
                          Blokir
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] font-semibold text-slate-400">
                      @{u.username} · {u.phone || u.email}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      hasPush
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {hasPush && <BellRing className="h-3 w-3" />}
                    {hasPush ? `Push (${u.push_count})` : "Web Saja"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {list.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] font-bold text-slate-500">
            <span>
              Hal {list.pagination.page} / {list.pagination.totalPages} ({list.pagination.total} user)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={list.pagination.page <= 1}
                onClick={() => list.setPage(list.pagination.page - 1)}
                className="rounded-lg p-1 hover:bg-slate-200/70 disabled:opacity-40"
                aria-label="Halaman user sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={list.pagination.page >= list.pagination.totalPages}
                onClick={() => list.setPage(list.pagination.page + 1)}
                className="rounded-lg p-1 hover:bg-slate-200/70 disabled:opacity-40"
                aria-label="Halaman user berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}

