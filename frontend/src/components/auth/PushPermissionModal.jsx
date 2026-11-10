import { useState } from "react";
import toast from "react-hot-toast";
import {
  BellRing,
  Copy,
  ExternalLink,
  PlusSquare,
  RefreshCw,
  Share2,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { requestAndCreateLocalPushSubscription } from "@/utils/push";
import { getAndroidChromeIntentUrl, isAndroidDevice } from "@/utils/pwa";

export default function PushPermissionModal({
  open,
  onClose,
  required = false,
  status,
  onActivated,
  onRecheck,
}) {
  const [busy, setBusy] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleActivate = async () => {
    setBusy(true);
    setErrorMsg("");
    try {
      const subscription = await requestAndCreateLocalPushSubscription();
      toast.success("Notifikasi aktif! Terima kasih telah mengizinkan notifikasi.");
      await onActivated?.(subscription);
    } catch (err) {
      const msg = err?.message || "Gagal mengaktifkan notifikasi.";
      setErrorMsg(msg);
      toast.error(msg);
      await onRecheck?.();
    } finally {
      setBusy(false);
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    setErrorMsg("");
    try {
      const fresh = await onRecheck?.();
      if (fresh?.ready && fresh?.subscription) {
        toast.success("Izin notifikasi terdeteksi aktif!");
        await onActivated?.(fresh.subscription);
      } else {
        toast("Notifikasi belum aktif. Pastikan izin browser sudah diizinkan.", { icon: "ℹ️" });
      }
    } finally {
      setRechecking(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin! Tempel dan buka di Google Chrome / Safari.");
    } catch {
      toast.error("Salin alamat URL di atas lalu buka di browser Chrome.");
    }
  };

  const iosNeedsInstall = Boolean(status?.iosNeedsInstall);
  const supported = Boolean(status?.supported);
  const permission = status?.permission || "default";
  const inApp = Boolean(status?.inApp);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={required ? "Aktifkan Notifikasi (Wajib)" : "Izinkan Notifikasi"}
    >
      <div className="space-y-4">
        {/* Hero Card */}
        <div className="flex items-start gap-3.5 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-4 text-white shadow-md">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <BellRing className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            {required && (
              <span className="inline-block rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 mb-1">
                Syarat Pendaftaran Akun
              </span>
            )}
            <p className="text-sm font-extrabold leading-snug">
              Dapatkan Notifikasi Status Pinjaman &amp; Pengumuman Resmi
            </p>
            <p className="mt-1 text-xs font-medium text-white/80 leading-relaxed">
              {required
                ? "Semua pendaftar wajib mengaktifkan notifikasi agar tidak ketinggalan informasi persetujuan, pencairan limit, dan promo Fastkredit."
                : "Izinkan notifikasi agar Anda langsung menerima info status pengajuan, pencairan dana, dan pengumuman terbaru."}
            </p>
          </div>
        </div>

        {/* Skenario 1: iOS Safari perlu Add to Home Screen */}
        {iosNeedsInstall && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs font-semibold text-indigo-950">
              Khusus pengguna <b>iPhone / iPad</b>, notifikasi push hanya aktif jika aplikasi dipasang ke Layar Utama:
            </div>
            <ol className="space-y-2.5 text-xs font-semibold text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-100 text-[11px] font-black text-primary-700">1</span>
                <span>
                  Ketuk ikon <b>Bagikan (Share)</b> <Share2 className="inline h-3.5 w-3.5 text-blue-600" /> di bilah Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-100 text-[11px] font-black text-primary-700">2</span>
                <span>
                  Pilih <b>Tambah ke Layar Utama (Add to Home Screen)</b> <PlusSquare className="inline h-3.5 w-3.5 text-slate-700" />.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-100 text-[11px] font-black text-primary-700">3</span>
                <span>
                  Buka aplikasi <b>Fastkredit</b> dari ikon di Layar Utama, lalu ketuk tombol aktifkan notifikasi.
                </span>
              </li>
            </ol>
            <Button
              type="button"
              variant="soft"
              icon={RefreshCw}
              loading={rechecking}
              onClick={handleRecheck}
              className="w-full"
            >
              Cek Ulang Status Notifikasi
            </Button>
          </div>
        )}

        {/* Skenario 2: In-App Browser / Browser tidak support PushManager */}
        {!iosNeedsInstall && !supported && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-950">
              <Smartphone className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">
                {inApp
                  ? "Anda membuka halaman dari browser bawaan aplikasi (WhatsApp/Instagram/TikTok/FB) yang membatasi fitur notifikasi. Silakan buka halaman ini di Google Chrome."
                  : "Browser atau mode saat ini (mis. Mode Samaran/Incognito atau non-HTTPS) tidak mendukung Web Push Notification. Buka melalui browser Google Chrome / Safari normal."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {isAndroidDevice() && (
                <a
                  href={getAndroidChromeIntentUrl()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-700 px-4 py-3 text-sm font-extrabold text-white shadow-md hover:bg-primary-800 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                  Buka Langsung di Google Chrome
                </a>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="soft" icon={Copy} onClick={handleCopyUrl} className="py-2.5 text-xs">
                  Salin Link
                </Button>
                <Button type="button" variant="ghost" icon={RefreshCw} loading={rechecking} onClick={handleRecheck} className="py-2.5 text-xs">
                  Cek Ulang
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Skenario 3: Izin diblokir sebelumnya oleh user */}
        {!iosNeedsInstall && supported && permission === "denied" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-900">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed">
                <p className="font-extrabold">Izin Notifikasi Diblokir oleh Browser</p>
                <p>
                  Ikuti langkah ini untuk membuka blokir: ketuk ikon <b>gembok / pengaturan situs</b> di bilah alamat URL browser → buka <b>Izin / Permissions</b> → ubah <b>Notifikasi (Notifications)</b> ke <b>Izinkan (Allow)</b>.
                </p>
              </div>
            </div>
            <Button
              type="button"
              icon={RefreshCw}
              loading={rechecking}
              onClick={handleRecheck}
              className="w-full"
            >
              Saya Sudah Izinkan — Cek Ulang
            </Button>
          </div>
        )}

        {/* Skenario 4: Siap minta izin native browser */}
        {!iosNeedsInstall && supported && permission !== "denied" && (
          <div className="space-y-3">
            {errorMsg && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700 ring-1 ring-red-200/70">
                {errorMsg}
              </div>
            )}
            <Button
              type="button"
              icon={BellRing}
              loading={busy}
              onClick={handleActivate}
              className="h-12 w-full text-sm"
            >
              Izinkan Notifikasi Sekarang
            </Button>
            {!required && (
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
                className="w-full py-2.5 text-xs"
              >
                Nanti Saja
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

