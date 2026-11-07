import { FILE_BASE_URL } from "@/utils/endpoints";

export const formatRupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(Number(n) || 0);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");

export const formatDateTime = (d) => `${formatDate(d)} • ${formatTime(d)}`;

export const fileUrl = (p) => {
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("blob:") || p.startsWith("data:")) {
    return p;
  }
  return `${FILE_BASE_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};

export const digitsOnly = (v) => String(v).replace(/\D/g, "");
