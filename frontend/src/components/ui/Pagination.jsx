import { ChevronLeft, ChevronRight } from "lucide-react";

const LIMITS = [10, 25, 50, 100];

function pageWindow(page, total) {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return list.flatMap((p, i) => (i && p - list[i - 1] > 1 ? ["…" + p, p] : [p]));
}

export default function Pagination({ pagination, onPage, limit, onLimit }) {
  const { page, totalPages, total } = pagination;
  const nav = "grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm font-bold transition disabled:opacity-40";
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {onLimit && (
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 font-bold" aria-label="Jumlah per halaman">
            {LIMITS.map((l) => <option key={l} value={l}>{l} / halaman</option>)}
          </select>
        )}
        <span>{total} data</span>
      </div>
      <div className="flex items-center gap-1">
        <button className={`${nav} text-slate-600 hover:bg-slate-100`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
        {pageWindow(page, totalPages).map((p) =>
          typeof p === "string" ? <span key={p} className="px-1 text-slate-400">…</span> : (
            <button key={p} onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined} className={`${nav} ${p === page ? "bg-primary-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{p}</button>
          )
        )}
        <button className={`${nav} text-slate-600 hover:bg-slate-100`} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Berikutnya"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
