import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MoreVertical,
  PlusSquare,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import logoImg from "@/assets/logo.png";
import Modal from "@/components/ui/Modal";
import {
  checkIsRelatedAppInstalled,
  clearDeferredPrompt,
  getAndroidChromeIntentUrl,
  getDeferredPrompt,
  initPwa,
  isAndroidDevice,
  isAppStandalone,
  isInAppBrowser,
  isIosBrowser,
  supportsBeforeInstallPrompt,
  waitForInstallPrompt,
} from "@/utils/pwa";

export default function FloatingInstallButton() {
  const [hasPrompt, setHasPrompt] = useState(() => Boolean(getDeferredPrompt()));
  const [isStandalone, setIsStandalone] = useState(() => isAppStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("fastkredit_install_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [installing, setInstalling] = useState(false);
  const [guideMode, setGuideMode] = useState(null); // null | "ios" | "inapp" | "browser"

  useEffect(() => {
    initPwa();

    const syncPrompt = () => {
      setHasPrompt(Boolean(getDeferredPrompt()));
      setIsStandalone(isAppStandalone());
    };

    const onInstalled = () => {
      clearDeferredPrompt();
      setHasPrompt(false);
      setIsStandalone(true);
      setGuideMode(null);
      toast.success("Fastkredit berhasil diinstall!");
    };

    syncPrompt();
    window.addEventListener("pwa-prompt-available", syncPrompt);
    window.addEventListener("pwa-prompt-cleared", syncPrompt);
    window.addEventListener("pwa-installed", onInstalled);

    const standaloneMql = window.matchMedia?.("(display-mode: standalone)");
    standaloneMql?.addEventListener?.("change", syncPrompt);

    checkIsRelatedAppInstalled().then((installed) => {
      if (installed) setIsStandalone(true);
    });

    return () => {
      window.removeEventListener("pwa-prompt-available", syncPrompt);
      window.removeEventListener("pwa-prompt-cleared", syncPrompt);
      window.removeEventListener("pwa-installed", onInstalled);
      standaloneMql?.removeEventListener?.("change", syncPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("fastkredit_install_dismissed", "1");
    } catch {}
  };

  const showContextualGuide = () => {
    if (isIosBrowser()) {
      setGuideMode("ios");
    } else if (isInAppBrowser()) {
      setGuideMode("inapp");
    } else {
      setGuideMode("browser");
    }
  };

  const triggerPrompt = async (promptEvent) => {
    try {
      await promptEvent.prompt();
      clearDeferredPrompt();
      setHasPrompt(false);

      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        toast.success("Memulai instalasi Fastkredit...");
      } else {
        toast("Instalasi dibatalkan. Klik Install lagi jika ingin memasang aplikasi.", { icon: "ℹ️" });
      }
      return true;
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        // User activation kedaluwarsa saat menunggu SW: simpan event agar klik berikutnya langsung muncul popup
        window.__pwaInstallPrompt = promptEvent;
        setHasPrompt(true);
        toast("Popup install siap! Ketuk tombol Install Aplikasi sekali lagi.", { icon: "📲" });
        return true;
      }
      console.error("Install prompt error:", err);
      clearDeferredPrompt();
      setHasPrompt(false);
      return false;
    }
  };

  const handleInstallClick = async () => {
    if (installing) return;

    // 1. Jika event BeforeInstallPrompt sudah siap, langsung tampilkan popup install native
    const immediatePrompt = getDeferredPrompt();
    if (immediatePrompt) {
      const triggered = await triggerPrompt(immediatePrompt);
      if (triggered) return;
    }

    // 2. Jika di Chrome/Edge/Samsung Internet baru selesai load SW, tunggu sebentar hingga event muncul
    if (supportsBeforeInstallPrompt()) {
      setInstalling(true);
      let waitedPrompt = null;
      try {
        waitedPrompt = await waitForInstallPrompt(3500);
      } finally {
        setInstalling(false);
      }

      if (waitedPrompt) {
        const triggered = await triggerPrompt(waitedPrompt);
        if (triggered) return;
      }

      if (await checkIsRelatedAppInstalled()) {
        setIsStandalone(true);
        toast.success("Fastkredit sudah terpasang di perangkat Anda!");
        return;
      }
    }

    // 3. Fallback terarah sesuai browser ketika native prompt tidak tersedia (iOS / WebView / Browser non-Chromium)
    showContextualGuide();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link halaman disalin! Tempel di Google Chrome / Safari.");
    } catch {
      toast.error("Salin alamat URL di atas lalu buka di Chrome.");
    }
  };

  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      <aside
        className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        aria-label="Install Aplikasi"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl sm:rounded-3xl bg-white p-3 sm:p-3.5 shadow-2xl shadow-indigo-950/20 ring-1 ring-slate-200/90">
          {/* Logo & Nama Aplikasi */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1 ring-1 ring-slate-100 shadow-sm">
              <img
                src={logoImg}
                alt="Logo Fastkredit"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-slate-800">Fastkredit</h3>
              <p className="truncate text-xs font-semibold text-slate-500">
                {hasPrompt ? "Siap diinstall 1-klik" : "Akses cepat & praktis"}
              </p>
            </div>
          </div>

          {/* Tombol Install & Dismiss */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="flex items-center gap-1.5 rounded-xl bg-primary-700 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-primary-700/30 transition hover:bg-primary-800 active:scale-95 disabled:opacity-70"
            >
              {installing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{installing ? "Menyiapkan..." : "Install Aplikasi"}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Tutup"
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Petunjuk iOS Safari */}
      <Modal
        open={guideMode === "ios"}
        onClose={() => setGuideMode(null)}
        title="Install di iPhone / iPad"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 ring-1 ring-slate-100 shadow-sm">
              <img src={logoImg} alt="Fastkredit" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Fastkredit</p>
              <p className="text-xs font-semibold text-slate-400">Browser di iOS tidak mendukung popup install otomatis</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm font-semibold text-slate-600">
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">1</span>
              <span>Ketuk ikon <b>Bagikan (Share)</b> <Share2 className="inline h-4 w-4 text-blue-600" /> di bilah browser (bawah di Safari, atau kanan atas di Chrome iOS).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">2</span>
              <span>Gulir ke bawah lalu pilih <b>Tambah ke Layar Utama (Add to Home Screen)</b> <PlusSquare className="inline h-4 w-4 text-slate-700" />.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">3</span>
              <span>Ketuk <b>Tambah (Add)</b> di pojok kanan atas.</span>
            </li>
          </ol>

          <button
            type="button"
            onClick={() => setGuideMode(null)}
            className="w-full rounded-2xl bg-primary-700 py-3 text-sm font-black text-white shadow-md hover:bg-primary-800 transition"
          >
            Mengerti
          </button>
        </div>
      </Modal>

      {/* Modal Buka di Chrome untuk In-App Browser (WhatsApp / IG / TikTok / FB) */}
      <Modal
        open={guideMode === "inapp"}
        onClose={() => setGuideMode(null)}
        title="Buka di Browser Utama"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
            <Smartphone className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              Anda sedang membuka halaman ini lewat browser bawaan aplikasi (WhatsApp/Instagram/TikTok), sehingga popup install otomatis dibatasi. Buka di <b>Google Chrome</b> untuk install 1-klik.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {isAndroidDevice() && (
              <a
                href={getAndroidChromeIntentUrl()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-700 py-3 text-sm font-black text-white shadow-md hover:bg-primary-800 transition"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Buka Langsung di Google Chrome</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-black text-slate-700 hover:bg-slate-100 transition"
            >
              <Copy className="h-4 w-4" />
              <span>Salin Link Halaman</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Petunjuk Browser Non-Popup / Mode Samaran */}
      <Modal
        open={guideMode === "browser"}
        onClose={() => setGuideMode(null)}
        title="Install Aplikasi Fastkredit"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 ring-1 ring-slate-100">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-600 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              Popup install otomatis sedang tidak aktif di sesi browser ini (misalnya karena sedang memakai Mode Samaran/Incognito, browser belum mendukung popup langsung, atau prompt baru saja ditutup).
            </p>
          </div>

          <ol className="space-y-3 text-sm font-semibold text-slate-600">
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">1</span>
              <span>Ketuk menu browser <MoreVertical className="inline h-4 w-4 text-slate-700" /> di pojok kanan atas (atau ikon <b>Install</b> di kolom alamat URL).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">2</span>
              <span>Pilih <b>Install aplikasi</b> / <b>Tambahkan ke Layar Utama</b>.</span>
            </li>
          </ol>

          <div className="flex flex-col gap-2.5">
            {isAndroidDevice() && (
              <a
                href={getAndroidChromeIntentUrl()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 py-3 text-sm font-black text-primary-800 hover:bg-primary-100 transition"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Buka di Google Chrome</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setGuideMode(null)}
              className="w-full rounded-2xl bg-primary-700 py-3 text-sm font-black text-white shadow-md hover:bg-primary-800 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
