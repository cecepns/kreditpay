import { useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import logoImg from "@/assets/logo.png";
import PwaInstallGuideModal from "@/components/PwaInstallGuideModal";
import usePwaInstall from "@/hooks/usePwaInstall";

export default function FloatingInstallButton() {
  const {
    isStandalone,
    installing,
    guideMode,
    setGuideMode,
    handleInstallClick,
    handleCopyUrl,
  } = usePwaInstall();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("fastkredit_install_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("fastkredit_install_dismissed", "1");
    } catch { }
  };

  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      <aside
        className="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-lg sm:inset-x-4 sm:bottom-5 sm:max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
        aria-label="Download Aplikasi"
      >
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 shadow-2xl shadow-indigo-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Baris Atas: Logo, Teks Lengkap, & Tutup (Mobile) */}
            <div className="flex items-start sm:items-center justify-between gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1 ring-1 ring-slate-200/80 shadow-sm">
                  <img
                    src={logoImg}
                    alt="Logo Fastkredit"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Download Aplikasi Sekarang
                  </h3>
                  {/* <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-600">
                    Download aplikasinya untuk kemudahan transaksi Anda
                  </p> */}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Tutup"
                className="sm:hidden shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tombol Download & Tutup (Desktop) */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-primary-700/25 transition hover:bg-primary-800 active:scale-95 disabled:opacity-70 whitespace-nowrap"
              >
                {installing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{installing ? "Menyiapkan..." : "Download"}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Tutup"
                className="hidden sm:inline-flex rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <PwaInstallGuideModal
        guideMode={guideMode}
        onClose={() => setGuideMode(null)}
        onCopyUrl={handleCopyUrl}
      />
    </>
  );
}
