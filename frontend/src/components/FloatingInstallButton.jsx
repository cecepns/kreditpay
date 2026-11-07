import { useEffect, useState } from "react";
import { Download, X, Share2, PlusSquare } from "lucide-react";
import toast from "react-hot-toast";
import logoImg from "@/assets/logo.png";
import Modal from "@/components/ui/Modal";

export default function FloatingInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Cek apakah sudah running sebagai standalone PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Cek apakah user pernah dismiss di sesi ini
    const isDismissed = sessionStorage.getItem("kreditpay_install_dismissed") === "1";
    setDismissed(isDismissed);

    // Tangkap event install PWA
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      toast.success("KreditPay IDN berhasil diinstall!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("kreditpay_install_dismissed", "1");
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          toast.success("Memulai instalasi KreditPay IDN...");
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
      return;
    }

    // Deteksi iOS / Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);

    if (isIos) {
      setShowIosGuide(true);
    } else {
      toast("Untuk menginstall, buka menu browser (titik tiga) lalu pilih 'Install aplikasi' atau 'Tambahkan ke Layar Utama'.", {
        icon: "📲",
        duration: 5000,
      });
    }
  };

  // Sembunyikan jika sudah terinstall atau di-dismiss
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
                alt="Logo KreditPay IDN"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-slate-800">KreditPay IDN</h3>
              <p className="truncate text-xs font-semibold text-slate-500">Akses cepat &amp; praktis</p>
            </div>
          </div>

          {/* Tombol Install & Dismiss */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-primary-700 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-primary-700/30 transition hover:bg-primary-800 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install Aplikasi</span>
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
        open={showIosGuide}
        onClose={() => setShowIosGuide(false)}
        title="Cara Install di iPhone / iPad"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 ring-1 ring-slate-100 shadow-sm">
              <img src={logoImg} alt="KreditPay IDN" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">KreditPay IDN</p>
              <p className="text-xs font-semibold text-slate-400">Pasang di layar utama untuk akses instan</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm font-semibold text-slate-600">
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">1</span>
              <span>Ketuk ikon <b>Bagikan (Share)</b> <Share2 className="inline h-4 w-4 text-blue-600" /> di bilah bawah browser Safari.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">2</span>
              <span>Gulir ke bawah lalu pilih opsi <b>Tambah ke Layar Utama (Add to Home Screen)</b> <PlusSquare className="inline h-4 w-4 text-slate-700" />.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-black text-primary-700">3</span>
              <span>Ketuk <b>Tambah (Add)</b> di pojok kanan atas untuk menyelesaikan instalasi.</span>
            </li>
          </ol>

          <button
            type="button"
            onClick={() => setShowIosGuide(false)}
            className="w-full rounded-2xl bg-primary-700 py-3 text-sm font-black text-white shadow-md hover:bg-primary-800 transition"
          >
            Mengerti
          </button>
        </div>
      </Modal>
    </>
  );
}
