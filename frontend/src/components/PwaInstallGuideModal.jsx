import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MoreVertical,
  PlusSquare,
  Share2,
  Smartphone,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import Modal from "@/components/ui/Modal";
import { getAndroidChromeIntentUrl, isAndroidDevice } from "@/utils/pwa";

export default function PwaInstallGuideModal({ guideMode, onClose, onCopyUrl }) {
  return (
    <>
      {/* Modal Petunjuk iOS Safari */}
      <Modal
        open={guideMode === "ios"}
        onClose={onClose}
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
            onClick={onClose}
            className="w-full rounded-2xl bg-primary-700 py-3 text-sm font-black text-white shadow-md hover:bg-primary-800 transition"
          >
            Mengerti
          </button>
        </div>
      </Modal>

      {/* Modal Buka di Chrome untuk In-App Browser (WhatsApp / IG / TikTok / FB) */}
      <Modal
        open={guideMode === "inapp"}
        onClose={onClose}
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
              onClick={onCopyUrl}
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
        onClose={onClose}
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
              onClick={onClose}
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

