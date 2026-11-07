import { useState } from "react";
import { Bell, Megaphone } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/StateViews";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatDateTime } from "@/utils/format";

export default function Notifications() {
  const list = usePaginated(API_ENDPOINTS.NOTIFICATIONS.LIST);
  const [detail, setDetail] = useState(null);

  return (
    <div className="min-h-[26rem] rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      {list.loading ? <ListSkeleton rows={3} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.rows.length === 0 ? (
        <EmptyState icon={Bell} text="Belum ada notifikasi." />
      ) : (
        <div className="space-y-3">
          {list.rows.map((n) => (
            <button key={n.id} onClick={() => setDetail(n)} className="flex w-full gap-4 rounded-2xl border border-l-4 border-blue-100 border-l-blue-500 bg-blue-50/70 p-4 text-left">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600"><Megaphone className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-blue-950">{n.title}</span>
                <span className="mt-0.5 block truncate font-semibold text-blue-800">Klik untuk membaca selengkapnya...</span>
                <span className="mt-2 flex items-center justify-between text-xs font-bold text-blue-400">{formatDateTime(n.created_at)}<u className="text-blue-700">Selengkapnya</u></span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!list.error && list.pagination.total > list.pagination.limit && <Pagination pagination={list.pagination} onPage={list.setPage} />}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        <p className="whitespace-pre-line font-semibold text-slate-600">{detail?.body}</p>
        <p className="mt-4 text-xs font-bold text-slate-400">{detail && formatDateTime(detail.created_at)}</p>
      </Modal>
    </div>
  );
}
