import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, BellOff, BellRing, Send, Share, Smartphone, X } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  getPushStatus,
  sendTestPush,
  subscribeUserPush,
  unsubscribeUserPush,
} from "@/utils/push";

const DISMISS_KEY = "fk_push_banner_dismissed";

export default function PushPermissionCard({ variant = "settings" }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const refreshStatus = useCallback(async () => {
    const next = await getPushStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    refreshStatus();
    const handler = () => refreshStatus();
    window.addEventListener("push-subscription-changed", handler);
    return () => window.removeEventListener("push-subscription-changed", handler);
  }, [refreshStatus]);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      const res = await subscribeUserPush();
      toast.success(res.message || "Push notification berhasil diaktifkan");
      await refreshStatus();
    } catch (err) {
      toast.error(err.message || "Gagal mengaktifkan push notification");
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      await unsubscribeUserPush();
      toast.success("Push notification di perangkat ini dinonaktifkan");
      await refreshStatus();
    } catch (err) {
      toast.error(err.message || "Gagal menonaktifkan push notification");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await sendTestPush();
      toast.success(res.message || "Tes push notification dikirim");
    } catch (err) {
      toast.error(err.message || "Gagal mengirim tes push");
    } finally {
      setTesting(false);
    }
  };

  const handleDismissBanner = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!status) return null;

  if (variant === "banner") {
    if (dismissed || status.active) return null;
    if (!status.supported && !status.iosNeedsInstall) return null;

    if (status.iosNeedsInstall) {
      return (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200/70">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Share className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-indigo-950">Aktifkan Notifikasi Push iPhone/iPad</p>
            <p className="mt-0.5 text-xs font-medium text-indigo-800/85 leading-relaxed">
              Ketuk ikon <b>Share</b> di Safari lalu pilih <b>Add to Home Screen (Tambah ke Layar Utama)</b>, kemudian buka aplikasi dari Layar Utama untuk menerima push notification.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            aria-label="Tutup panduan"
            className="rounded-lg p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-800 p-4 text-white shadow-md shadow-primary-700/20">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-snug">Aktifkan Notifikasi Push</p>
          <p className="mt-0.5 text-xs font-medium text-white/80">
            {status.permission === "denied"
              ? "Izin diblokir browser. Izinkan notifikasi di pengaturan browser Anda."
              : "Terima pemberitahuan pengajuan & pengumuman langsung ke perangkat Anda."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {status.permission !== "denied" && (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={busy}
              className="rounded-xl bg-accent-500 px-3.5 py-2 text-xs font-extrabold text-white shadow transition hover:bg-accent-600 active:scale-[.98] disabled:opacity-60"
            >
              {busy ? "Memproses..." : "Aktifkan"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismissBanner}
            aria-label="Tutup banner"
            className="rounded-xl p-1.5 text-white/70 hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // variant === "settings"
  let badge = { label: "Belum Aktif", cls: "bg-slate-100 text-slate-600" };
  if (status.iosNeedsInstall) {
    badge = { label: "Perlu Add to Home Screen", cls: "bg-indigo-50 text-indigo-700" };
  } else if (!status.supported) {
    badge = { label: "Tidak Didukung", cls: "bg-slate-100 text-slate-500" };
  } else if (status.permission === "denied") {
    badge = { label: "Diblokir Browser", cls: "bg-red-50 text-red-600" };
  } else if (status.active) {
    badge = { label: "Aktif", cls: "bg-emerald-50 text-emerald-700" };
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              status.active ? "bg-emerald-50 text-emerald-600" : "bg-primary-50 text-primary-700"
            }`}
          >
            {status.active ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-800">Push Notification</h3>
            <p className="text-xs font-medium text-slate-500">
              Notifikasi langsung ke HP/perangkat meskipun browser tertutup.
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {status.iosNeedsInstall && (
        <div className="rounded-2xl bg-indigo-50/80 p-3.5 text-xs font-medium text-indigo-900 ring-1 ring-indigo-200/60">
          Khusus iPhone/iPad (iOS 16.4+): buka via Safari, ketuk <b>Share → Add to Home Screen</b>, lalu buka aplikasi dari Layar Utama untuk mengaktifkan notifikasi push.
        </div>
      )}

      {!status.iosNeedsInstall && status.permission === "denied" && (
        <div className="rounded-2xl bg-red-50 p-3.5 text-xs font-medium text-red-700 ring-1 ring-red-200/70">
          Izin notifikasi saat ini diblokir oleh browser Anda. Ketuk ikon gembok / pengaturan situs di address bar browser lalu ubah izin <b>Notifications</b> menjadi <b>Allow (Izinkan)</b>, kemudian muat ulang halaman.
        </div>
      )}

      {status.totalDevices > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-600">
          <Smartphone className="h-4 w-4 text-primary-700 shrink-0" />
          <span>{status.totalDevices} perangkat akun ini terdaftar menerima push notification.</span>
        </div>
      )}

      {status.supported && !status.iosNeedsInstall && status.permission !== "denied" && (
        <div className="flex flex-wrap items-center gap-2">
          {status.active ? (
            <>
              <Button
                type="button"
                variant="soft"
                icon={Send}
                loading={testing}
                onClick={handleTest}
                className="flex-1 py-2.5 text-xs"
              >
                Tes Kirim Notif
              </Button>
              <Button
                type="button"
                variant="ghost"
                icon={BellOff}
                loading={busy}
                onClick={handleUnsubscribe}
                className="py-2.5 text-xs text-red-600 hover:bg-red-50"
              >
                Nonaktifkan
              </Button>
            </>
          ) : (
            <Button
              type="button"
              icon={BellRing}
              loading={busy}
              onClick={handleSubscribe}
              className="w-full py-2.5 text-sm"
            >
              Aktifkan Push Notification
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

