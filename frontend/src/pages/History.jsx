import { Receipt, Search } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import Pagination from "@/components/ui/Pagination";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/StateViews";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatDateTime, formatRupiah } from "@/utils/format";
import { TX_META } from "@/constants/transactionTypes";

export default function History() {
  const list = usePaginated(API_ENDPOINTS.TRANSACTIONS.LIST);

  return (
    <div className="min-h-[26rem] rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="p-4 pb-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Cari transaksi..." className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold focus:border-primary-500 focus:outline-none" />
        </div>
      </div>

      {list.loading ? <ListSkeleton /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.rows.length === 0 ? (
        <EmptyState icon={Receipt} text={list.search ? "Transaksi tidak ditemukan." : "Belum ada riwayat transaksi."} />
      ) : (
        <ul className="divide-y divide-slate-100 p-2">
          {list.rows.map((t) => {
            const meta = TX_META[t.type];
            return (
              <li key={t.id} className="flex items-center gap-3 p-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${meta.tone}`}><meta.icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-slate-800">{t.title}</p>
                  <p className="text-xs font-semibold text-slate-400">{formatDateTime(t.created_at)}{t.source === "paylater" && " • Pinjaman"}</p>
                </div>
                <p className={`font-extrabold ${meta.sign === "+" ? "text-emerald-600" : "text-slate-800"}`}>{meta.sign}{formatRupiah(t.amount)}</p>
              </li>
            );
          })}
        </ul>
      )}
      {!list.error && list.pagination.total > 0 && <Pagination pagination={list.pagination} onPage={list.setPage} />}
    </div>
  );
}
