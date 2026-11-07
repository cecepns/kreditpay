import { MessagesSquare } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function HelpButton() {
  const { data } = useFetch(API_ENDPOINTS.SETTINGS.PUBLIC);
  const waUrl = data?.data?.whatsapp_url || import.meta.env.VITE_SUPPORT_URL || "https://wa.me/6281200000000";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-30 mx-auto flex max-w-xl justify-end px-4">
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Hubungi Bantuan Customer Service via WhatsApp"
        className="pointer-events-auto flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
      >
        <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-lg ring-1 ring-slate-100">
          Butuh Bantuan?
        </span>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-500 text-white shadow-lg shadow-accent-500/40">
          <MessagesSquare className="h-7 w-7" />
        </span>
      </a>
    </div>
  );
}
