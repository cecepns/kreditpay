import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/StateViews";

export default function DataTable({ columns, rows, loading, error, onRetry, sort, onSort, actions }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  const colSpan = columns.length + (actions ? 1 : 0);
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
          <tr>
            {columns.map((c) => {
              const Icon = sort?.sortBy === c.key ? (sort.order === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
              return (
                <th key={c.key} className="px-4 py-3.5 font-black whitespace-nowrap">
                  {c.sortable && onSort ? (
                    <button onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:text-primary-700">
                      {c.label}
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
            {actions && <th className="px-4 py-3.5 text-right font-black whitespace-nowrap">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}><td colSpan={colSpan} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
          ))}
          {!loading && rows.length === 0 && <tr><td colSpan={colSpan}><EmptyState text="Belum ada data" /></td></tr>}
          {!loading && rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 transition">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {actions && <td className="px-4 py-3.5 text-right whitespace-nowrap">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
