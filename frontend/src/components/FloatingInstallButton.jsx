import { useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import logoImg from "@/assets/logo.png";
import PwaInstallGuideModal from "@/components/PwaInstallGuideModal";
import usePwaInstall from "@/hooks/usePwaInstall";

export default function FloatingInstallButton() {
  const {
    hasPrompt,
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
    } catch {}
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
                {hasPrompt ? "Siap diinstall 1-klik" : "Download untuk kemudahan transaksi"}
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

      <PwaInstallGuideModal
        guideMode={guideMode}
        onClose={() => setGuideMode(null)}
        onCopyUrl={handleCopyUrl}
      />
    </>
  );
}
