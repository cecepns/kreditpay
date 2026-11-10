import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Megaphone, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import PushPermissionCard from "@/components/PushPermissionCard";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/StateViews";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatDateTime } from "@/utils/format";

export default function Notifications() {
  const navigate = useNavigate();
  const list = usePaginated(API_ENDPOINTS.NOTIFICATIONS.LIST);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const onPush = () => list.reload();
    window.addEventListener("app-push-received", onPush);
    return () => window.removeEventListener("app-push-received", onPush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStyle = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("disetujui") || t.includes("acc")) {
      return {
        card: "border-emerald-100 border-l-emerald-500 bg-emerald-50/80 hover:bg-emerald-100/70",
        iconBox: "bg-emerald-100 text-emerald-600",
        icon: CheckCircle2,
        titleColor: "text-emerald-950",
        linkColor: "text-emerald-700",
      };
    }
    if (t.includes("ditolak") || t.includes("belum disetujui")) {
      return {
        card: "border-rose-100 border-l-rose-500 bg-rose-50/80 hover:bg-rose-100/70",
        iconBox: "bg-rose-100 text-rose-600",
        icon: XCircle,
        titleColor: "text-rose-950",
        linkColor: "text-rose-700",
      };
    }
    return {
      card: "border-blue-100 border-l-blue-500 bg-blue-50/80 hover:bg-blue-100/70",
      iconBox: "bg-blue-100 text-blue-600",
      icon: Megaphone,
      titleColor: "text-blue-950",
      linkColor: "text-blue-700",
    };
  };

  return (
    <div>
      <PushPermissionCard variant="banner" />
      <div className="min-h-[26rem] rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      {list.loading ? (
        <ListSkeleton rows={3} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={Bell} text="Belum ada notifikasi." />
      ) : (
        <div className="space-y-3">
          {list.rows.map((n) => {
            const style = getStyle(n.title);
            const Icon = style.icon;
            return (
              <button
                key={n.id}
                onClick={() => setDetail(n)}
                className={`flex w-full gap-4 rounded-2xl border border-l-4 p-4 text-left transition ${style.card}`}
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-xs ${style.iconBox}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-extrabold text-sm sm:text-base leading-snug ${style.titleColor}`}>
                    {n.title}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs font-medium text-slate-600">
                    {n.body}
                  </span>
                  <span className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    {formatDateTime(n.created_at)}
                    <u className={`font-black ${style.linkColor}`}>Baca Rincian</u>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!list.error && list.pagination.total > list.pagination.limit && (
        <Pagination pagination={list.pagination} onPage={list.setPage} />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        <div className="space-y-3 pt-1">
          <p className="whitespace-pre-line text-sm font-medium text-slate-700 leading-relaxed">
            {detail?.body}
          </p>
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Waktu:</span>
            <span>{detail && formatDateTime(detail.created_at)}</span>
          </div>
          {detail?.click_url && detail.click_url !== "/app/notifikasi" && (
            <div className="pt-1">
              <Button
                type="button"
                variant="soft"
                icon={ArrowUpRight}
                className="w-full py-2.5 text-xs"
                onClick={() => {
                  const target = detail.click_url;
                  setDetail(null);
                  if (target.startsWith("http")) window.open(target, "_blank", "noopener,noreferrer");
                  else navigate(target);
                }}
              >
                Buka Halaman Terkait
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
    </div>
  );
}
