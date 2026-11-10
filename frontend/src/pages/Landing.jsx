import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Rocket,
  ShieldCheck,
  Timer,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  BadgeCheck,
  CreditCard,
  Banknote,
  Calculator,
  ChevronRight,
  Headphones,
  Check,
  TrendingUp,
  FileCheck2,
  Clock,
  HelpCircle,
  Smartphone,
  Star,
  Download,
  Loader2,
} from "lucide-react";
import Logo from "@/components/Logo";
import FloatingInstallButton from "@/components/FloatingInstallButton";
import PwaInstallGuideModal from "@/components/PwaInstallGuideModal";
import useAuth from "@/hooks/useAuth";
import usePwaInstall from "@/hooks/usePwaInstall";
import { formatRupiah } from "@/utils/format";
import heroImage from "@/assets/image-landing.avif";
import logoBankIndonesia from "@/assets/bank-indonesia.png";
import logoLPS from "@/assets/Logo_LPS.png";
import logoIcon from "@/assets/logo-icon.png";

const STATS = [
  { value: "Rp 500 Juta", label: "Plafon Pinjaman Maksimal", desc: "Limit pinjaman tunai & PayLater tertinggi" },
  { value: "< 5 Menit", label: "Persetujuan Kilat", desc: "Verifikasi dokumen otomatis 24 jam" },
  { value: "2.0% Flat/Thn", label: "Bunga Paling Ringan", desc: "Mulai dari 0.16% flat per bulan" },
  { value: "99.8%", label: "Tingkat Kepuasan Nasabah", desc: "Dipercaya puluhan ribu pengguna aktif" },
];

const ADVANTAGES = [
  {
    icon: Wallet,
    title: "Limit Plafon Hingga Rp 500 Juta",
    desc: "Akses fasilitas limit pinjaman dana tunai dan cicilan belanja dengan plafon maksimal hingga Rp 500.000.000.",
    badge: "Plafon Tertinggi",
    color: "from-blue-600 to-indigo-600",
  },
  {
    icon: Zap,
    title: "Proses Kilat 100% Online",
    desc: "Cukup siapkan e-KTP dan smartphone Anda. Seluruh proses pendaftaran hingga persetujuan berlangsung tanpa ribet.",
    badge: "Cepat & Praktis",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: TrendingUp,
    title: "Bunga Ringan 2% Flat/Tahun",
    desc: "Suku bunga kompetitif mulai 0.16% per bulan tanpa biaya tersembunyi. Skema cicilan transparan dan mudah dipahami.",
    badge: "Bunga Kompetitif",
    color: "from-emerald-600 to-teal-600",
  },
  {
    icon: ShieldCheck,
    title: "Keamanan Enkripsi Bank-Grade",
    desc: "Privasi dan dokumen identitas Anda dilindungi dengan standar enkripsi SSL 256-bit dan audit keamanan ketat.",
    badge: "Aman & Terenkripsi",
    color: "from-purple-600 to-pink-600",
  },
  {
    icon: Clock,
    title: "Tenor Fleksibel s/d 36 Bulan",
    desc: "Pilih jangka waktu cicilan mulai dari 3, 6, 12, 24, hingga 36 bulan sesuai dengan rencana keuangan pribadi Anda.",
    badge: "Tenor Fleksibel",
    color: "from-sky-600 to-cyan-600",
  },
  {
    icon: Headphones,
    title: "Customer Support 24/7 Siaga",
    desc: "Tim layanan bantuan pelanggan profesional siap mendampingi kebutuhan transaksi dan pengajuan Anda kapan saja.",
    badge: "Respon Cepat",
    color: "from-rose-600 to-red-500",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Registrasi Akun",
    desc: "Daftar secara instan menggunakan nomor ponsel aktif dan lengkapi data profil dasar Anda.",
  },
  {
    step: "02",
    title: "Lengkapi Berkas e-KTP",
    desc: "Unggah foto e-KTP asli dan dokumen pendukung tanpa perlu menyerahkan jaminan fisik atau agunan.",
  },
  {
    step: "03",
    title: "Persetujuan Kilat",
    desc: "Sistem cerdas memverifikasi pengajuan dan menerbitkan Surat Persetujuan Pinjaman (SKPK) resmi.",
  },
  {
    step: "04",
    title: "Dana Cair ke Rekening",
    desc: "Limit aktif seketika dan dapat Anda cairkan langsung ke rekening bank pribadi dalam hitungan menit.",
  },
];

const PRESET_AMOUNTS = [10000000, 50000000, 100000000, 250000000, 500000000];
const TENORS = [3, 6, 12, 24, 36];

const FAQS = [
  {
    q: "Siapa saja yang dapat mengajukan pinjaman di Fastkredit?",
    a: "Warga Negara Indonesia (WNI) berusia minimal 21 tahun dan maksimal 60 tahun saat pelunasan, memiliki e-KTP yang valid, serta memiliki sumber penghasilan aktif.",
  },
  {
    q: "Berapa lama proses persetujuan dan pencairan dana?",
    a: "Proses verifikasi dokumen umumnya berlangsung kilat dalam waktu 5 hingga 15 menit pada jam operasional. Setelah disetujui, dana langsung masuk ke limit akun dan siap dicairkan ke rekening bank Anda.",
  },
  {
    q: "Apakah pengajuan memerlukan jaminan atau agunan barang?",
    a: "Tidak sama sekali. Fasilitas kredit di Fastkredit bersifat 100% tanpa agunan (KTA digital). Anda tidak perlu menjaminkan BPKB, sertifikat, atau aset fisik apa pun.",
  },
  {
    q: "Berapa suku bunga dan biaya administrasi di Fastkredit?",
    a: "Suku bunga sangat ringan dan transparan, yaitu 2% flat per tahun (setara 0.16% per bulan), serta bebas biaya administrasi pembukaan fasilitas kredit (Rp 0).",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const {
    isStandalone,
    installing,
    guideMode,
    setGuideMode,
    handleInstallClick,
    handleCopyUrl,
  } = usePwaInstall();
  const home = user ? (user.role === "admin" ? "/admin" : "/app") : "/login";

  // State Simulasi Kalkulator Cicilan
  const [calcAmount, setCalcAmount] = useState(50000000); // 50 Juta default
  const [calcTenor, setCalcTenor] = useState(12); // 12 bulan default
  const [openFaq, setOpenFaq] = useState(null);

  // Perhitungan cicilan: Bunga 2% flat per tahun (0.166% per bulan)
  const simulation = useMemo(() => {
    const annualInterestRate = 0.02;
    const years = calcTenor / 12;
    const totalInterest = calcAmount * annualInterestRate * years;
    const totalReturn = calcAmount + totalInterest;
    const monthlyInstallment = Math.round(totalReturn / calcTenor);

    return {
      monthlyInstallment,
      totalInterest,
      totalReturn,
    };
  }, [calcAmount, calcTenor]);

  return (
    <div className="min-h-screen bg-slate-50 font-display text-slate-800 antialiased selection:bg-primary-500 selection:text-white">
      {/* ── 1. TOP ANNOUNCEMENT BAR ── */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 px-4 py-2 text-center text-xs font-semibold text-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Layanan Pinjaman &amp; Fasilitas Kredit Resmi Fastkredit — Plafon maksimal kini hingga <strong>Rp 500.000.000</strong></span>
        </div>
      </div>

      {/* ── 2. STICKY NAVBAR ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" className="shrink-0 transition hover:opacity-95">
            <Logo size="sm" />
          </Link>

          {/* Navigasi Desktop */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#keunggulan" className="transition hover:text-primary-700">Keunggulan</a>
            <a href="#simulasi" className="transition hover:text-primary-700">Simulasi Cicilan</a>
            <a href="#cara-kerja" className="transition hover:text-primary-700">Cara Pengajuan</a>
            <a href="#faq" className="transition hover:text-primary-700">Tanya Jawab</a>
          </nav>

          {/* Tombol Aksi Kanan */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link
                to={home}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-700 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-primary-700/20 transition hover:bg-primary-800 active:scale-95"
              >
                <span>Dashboard Akun</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-primary-700 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-primary-700/25 transition hover:bg-primary-800 active:scale-95"
                >
                  <span>Daftar Akun</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── 3. HERO SECTION DENGAN FINTECH SHOWPIECE ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-8 pb-16 sm:pt-14 sm:pb-24">
        {/* Glow Latar Belakang */}
        <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary-400/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-[-10%] h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Sisi Kiri: Teks & CTA */}
            <div className="text-center lg:col-span-7 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-black text-primary-800 shadow-2xs backdrop-blur">
                <Sparkles className="h-4 w-4 text-primary-600" />
                <span>Plafon Pinjaman Kilat Hingga Rp 500 Juta</span>
              </div>

              <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                Fasilitas Pinjaman Digital &amp; PayLater{" "}
                <span className="bg-gradient-to-r from-primary-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Cair Kilat Tanpa Jaminan
                </span>
              </h1>

              <p className="mt-5 text-base font-semibold leading-relaxed text-slate-600 sm:text-lg max-w-2xl mx-auto lg:mx-0">
                Solusi pembiayaan dana tunai terpercaya bersama <strong className="text-slate-900">Fastkredit</strong>. Nikmati kemudahan pengajuan dengan plafon limit hingga <strong className="text-primary-800">Rp 500.000.000</strong>, bunga ringan flat 2%/tahun, dan pencairan instan langsung ke rekening bank Anda.
              </p>

              {/* Ajakan Wajib Install Aplikasi Sebelum Pengajuan */}
              {!isStandalone && (
                <div className="mt-6 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-white to-primary-50/80 p-4 shadow-sm ring-1 ring-amber-100/70 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200/80 mt-0.5">
                        <Smartphone className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                          Wajib Instal Aplikasi
                        </span>
                        <p className="mt-1 text-sm font-black text-slate-900 leading-snug">
                          Download aplikasinya untuk kemudahan transaksi Anda.
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600 leading-relaxed">
                          Ayo cairkan pinjaman Anda, namun instal aplikasi <strong>Fastkredit</strong> terlebih dahulu sebelum melanjutkan pengajuan.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleInstallClick}
                      disabled={installing}
                      className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-3 text-xs font-black text-white shadow-md shadow-primary-700/25 transition hover:bg-primary-800 active:scale-95 disabled:opacity-70"
                    >
                      {installing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span>{installing ? "Menyiapkan..." : "Instal Aplikasi"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tombol CTA */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Link
                  to={user ? "/app/paylater" : "/register"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary-700 via-indigo-700 to-purple-700 px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-primary-700/25 transition hover:brightness-110 active:scale-95"
                >
                  <Rocket className="h-5 w-5" />
                  <span>Ajukan Pinjaman Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#simulasi"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
                >
                  <Calculator className="h-4 w-4 text-primary-600" />
                  <span>Hitung Simulasi Cicilan</span>
                </a>
              </div>

              {/* 4 Keunggulan Cepat */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200/80">
                {[
                  { text: "Limit Rp 500 Juta", sub: "Plafon Maksimal" },
                  { text: "Bunga 2% Flat/Thn", sub: "Super Ringan" },
                  { text: "Proses < 5 Menit", sub: "Persetujuan Kilat" },
                  { text: "100% Tanpa Agunan", sub: "Cukup e-KTP" },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col text-left">
                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{item.text}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 pl-5">{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sisi Kanan: Kartu FinTech Modern Showpiece */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm sm:max-w-md">
                {/* Kartu Platinum Eksklusif Fastkredit */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-primary-950 to-indigo-950 p-6 sm:p-7 text-white shadow-2xl shadow-indigo-950/40 ring-1 ring-white/20">
                  {/* Ornamen Kilau Kartu */}
                  <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary-500/30 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/25 blur-2xl pointer-events-none" />

                  {/* Header Kartu */}
                  <div className="flex items-center justify-between pb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 p-1 backdrop-blur-md ring-1 ring-white/15">
                        <img src={logoIcon} alt="Fastkredit" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-wider uppercase text-white/90">Fastkredit Platinum</p>
                        <p className="text-[10px] font-semibold text-emerald-400">Limit Aktif Disetujui</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-300 backdrop-blur">
                      Kredit Digital
                    </span>
                  </div>

                  {/* Chip & Sinyal Contactless */}
                  <div className="flex items-center justify-between py-2">
                    <div className="h-9 w-12 rounded-lg bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 shadow-inner flex flex-col justify-around p-1 border border-amber-100/50">
                      <div className="h-0.5 w-full bg-amber-600/30 rounded" />
                      <div className="h-0.5 w-full bg-amber-600/30 rounded" />
                    </div>
                    <CreditCard className="h-6 w-6 text-white/50" />
                  </div>

                  {/* Nilai Limit Plafon */}
                  <div className="pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Plafon Pinjaman Maksimal</p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                      Rp 500.000.000
                    </p>
                  </div>

                  {/* Footer Kartu */}
                  <div className="flex items-end justify-between pt-6 border-t border-white/10 mt-4 text-[11px]">
                    <div>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Pemegang Akun</p>
                      <p className="font-extrabold tracking-wide uppercase text-slate-200">
                        {user?.name || "Nasabah Terverifikasi"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Status Proteksi</p>
                      <p className="font-extrabold text-emerald-400 flex items-center justify-end gap-1">
                        <Lock className="h-3 w-3" /> SSL 256-Bit
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Notification Badge 1: Pencairan Instan */}
                <div className="absolute -bottom-6 -left-4 sm:-left-6 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-slate-100 max-w-[270px] animate-bounce-slow">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-black text-slate-900">Dana Cair Seketika</p>
                    <p className="text-[10px] font-semibold text-slate-500">Langsung ke rekening nasabah</p>
                  </div>
                </div>

                {/* Floating Notification Badge 2: Surat Keputusan Resmi */}
                <div className="absolute -top-5 -right-3 sm:-right-5 flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-100">
                  <BadgeCheck className="h-5 w-5 text-primary-600" />
                  <div className="text-left">
                    <p className="text-[11px] font-extrabold text-slate-800">Surat SKPK Resmi</p>
                    <p className="text-[9px] font-bold text-emerald-600">Terbit Otomatis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. KEY FIGURES / STATS BANNER ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 rounded-3xl bg-white p-5 sm:p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/80">
          {STATS.map((s, idx) => (
            <div key={idx} className="p-3 text-center sm:text-left border-b last:border-b-0 sm:border-b-0 sm:border-r last:border-r-0 border-slate-100">
              <p className="text-xl sm:text-2xl lg:text-3xl font-black text-primary-800 tracking-tight">{s.value}</p>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-slate-800">{s.label}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400 hidden sm:block">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. SIMULASI PERHITUNGAN CICILAN INTERAKTIF ── */}
      <section id="simulasi" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3.5 py-1 text-xs font-black text-primary-800">
            <Calculator className="h-3.5 w-3.5 text-primary-600" />
            Kalkulator Simulasi Pinjaman
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hitung Estimasi Cicilan Bulanan Anda
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Pilih nominal pinjaman dan jangka waktu tenor. Skema suku bunga flat 2% per tahun transparan tanpa biaya tersembunyi.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start rounded-3xl bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/80">
          {/* Kolom Slider & Pilihan Tenor */}
          <div className="lg:col-span-7 space-y-8">
            {/* Slider Nominal */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Nominal Pinjaman</span>
                <span className="text-xl sm:text-2xl font-black text-primary-800">{formatRupiah(calcAmount)}</span>
              </div>

              <input
                type="range"
                min={5000000}
                max={500000000}
                step={5000000}
                value={calcAmount}
                onChange={(e) => setCalcAmount(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />

              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2">
                <span>Rp 5.000.000</span>
                <span>Rp 250.000.000</span>
                <span className="text-primary-700 font-extrabold">Rp 500.000.000</span>
              </div>

              {/* Tombol Cepat Nominal */}
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCalcAmount(amt)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      calcAmount === amt
                        ? "bg-primary-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Tenor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Pilihan Jangka Waktu (Tenor)</span>
                <span className="text-base font-black text-slate-900">{calcTenor} Bulan</span>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {TENORS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCalcTenor(t)}
                    className={`rounded-2xl py-3 text-center transition font-black text-xs sm:text-sm ${
                      calcTenor === t
                        ? "bg-primary-700 text-white shadow-md shadow-primary-700/25 ring-2 ring-primary-700 ring-offset-2"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {t} Bln
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Kolom Hasil Rincian Simulasi */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-primary-900 via-primary-950 to-indigo-950 p-6 sm:p-8 text-white space-y-6 shadow-xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">Estimasi Cicilan Bulanan</p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 mt-1 tracking-tight">
                {formatRupiah(simulation.monthlyInstallment)}
                <span className="text-xs font-semibold text-white/80"> / bulan</span>
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
              <div className="flex justify-between items-center text-white/80">
                <span>Plafon Pinjaman</span>
                <span className="font-extrabold text-white">{formatRupiah(calcAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span>Tenor Angsuran</span>
                <span className="font-extrabold text-white">{calcTenor} Bulan</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span>Suku Bunga Flat</span>
                <span className="font-extrabold text-emerald-400">2.0% Flat / Tahun (0.16%/bln)</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span>Biaya Provisi / Admin</span>
                <span className="font-extrabold text-emerald-400">Rp 0 (Bebas Biaya)</span>
              </div>
              <div className="flex justify-between items-center text-white/80 pt-2 border-t border-white/10">
                <span>Total Estimasi Pengembalian</span>
                <span className="font-black text-base text-white">{formatRupiah(simulation.totalReturn)}</span>
              </div>
            </div>

            <Link
              to={user ? "/app/paylater" : "/register"}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-95"
            >
              <span>Ajukan Nominal Ini Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="text-[10px] text-center text-white/50 leading-relaxed">
              *Simulasi di atas adalah estimasi resmi berdasarkan suku bunga flat Fastkredit. Persetujuan limit final ditentukan berdasarkan hasil evaluasi verifikasi data.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. KEUNGGULAN UTAMA (WHY FASTKREDIT) ── */}
      <section id="keunggulan" className="bg-white py-16 sm:py-24 border-y border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-black text-indigo-800">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              Keunggulan Fastkredit
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Kenapa Memilih Layanan Fastkredit?
            </h2>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Standar pembiayaan digital modern dengan perlindungan data maksimal dan kepastian pencairan.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADVANTAGES.map((adv, idx) => {
              const Icon = adv.icon;
              return (
                <div
                  key={idx}
                  className="group relative rounded-3xl bg-slate-50 p-6 sm:p-7 border border-slate-200/80 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-100 text-primary-700 shadow-2xs group-hover:bg-primary-700 group-hover:text-white transition">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-700 transition">
                      {adv.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">{adv.title}</h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{adv.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. CARA PENGAJUAN (4 LANGKAH MUDAH) ── */}
      <section id="cara-kerja" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-black text-emerald-800">
            <Timer className="h-3.5 w-3.5 text-emerald-600" />
            Alur Pengajuan Kilat
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            4 Langkah Mudah Mencairkan Pinjaman
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Seluruh proses berlangsung dari genggaman ponsel tanpa antre atau survei tatap muka.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, idx) => (
            <div key={idx} className="relative rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80">
              <span className="text-3xl font-black text-primary-200 block mb-3">{s.step}</span>
              <h3 className="text-base font-extrabold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. FAQ RINGKAS ── */}
      <section id="faq" className="bg-slate-100/70 py-16 sm:py-24 border-t border-slate-200/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3.5 py-1 text-xs font-black text-slate-700">
              <HelpCircle className="h-3.5 w-3.5" />
              Pertanyaan Populer
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm font-extrabold text-slate-800 hover:text-primary-700 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-90 text-primary-700" : "text-slate-400"}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs font-semibold leading-relaxed text-slate-600 border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 9. CTA BANNER BAWAH ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-950 via-primary-900 to-indigo-900 px-6 py-12 sm:px-12 sm:py-16 text-center text-white shadow-2xl">
          <div className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Siap Dapatkan Fasilitas Pinjaman Hingga Rp 500 Juta Hari Ini?
          </h2>
          <p className="mt-4 text-xs sm:text-sm font-medium text-white/80 max-w-xl mx-auto leading-relaxed">
            {isStandalone
              ? "Daftarkan diri Anda dalam 2 menit. Nikmati kemudahan proses instan, bunga ringan, dan layanan pelanggan prioritas bersama Fastkredit."
              : "Download aplikasinya untuk kemudahan transaksi Anda. Ayo cairkan pinjaman Anda dengan menginstal aplikasi Fastkredit terlebih dahulu."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition active:scale-95 disabled:opacity-70"
              >
                {installing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{installing ? "Menyiapkan..." : "Instal Aplikasi Dulu"}</span>
              </button>
            )}
            <Link
              to={user ? "/app/paylater" : "/register"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-black text-primary-950 shadow-lg shadow-black/20 hover:bg-slate-100 transition active:scale-95"
            >
              <span>Mulai Pengajuan Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 10. FOOTER RESMI ── */}
      <footer className="border-t border-slate-200/90 bg-white py-12 text-slate-500 pb-28 sm:pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-8 text-center sm:text-left">
            <Logo size="sm" />
            <p className="text-xs font-semibold text-slate-400">
              Platform Layanan Fasilitas Pinjaman &amp; Keuangan Digital Terpercaya di Indonesia.
            </p>
          </div>

          {/* Logo Mitra & Penjaminan: Bank Indonesia & LPS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-2xl bg-slate-50 p-5 sm:p-6 border border-slate-200/80">
            <div className="text-center sm:text-left">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Sistem Pembayaran &amp; Penjaminan Resmi
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Mendukung standar kepatuhan sistem transaksi perbankan dan perlindungan keamanan keuangan nasabah di Indonesia.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center justify-center bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <img
                  src={logoBankIndonesia}
                  alt="Bank Indonesia"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-center bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <img
                  src={logoLPS}
                  alt="Lembaga Penjamin Simpanan (LPS)"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs leading-relaxed font-medium">
            <div>
              <p className="font-extrabold uppercase tracking-wider text-slate-800 mb-2">Keamanan &amp; Kepatuhan</p>
              <p className="text-slate-500">
                Fastkredit menerapkan standar enkripsi data tertinggi (SSL 256-bit) guna menjamin seluruh kerahasiaan identitas dan keamanan transaksi nasabah.
              </p>
            </div>
            <div>
              <p className="font-extrabold uppercase tracking-wider text-slate-800 mb-2">Bantuan Pelanggan</p>
              <p className="text-slate-500">
                Hotline WhatsApp &amp; Live Chat CS siaga setiap hari (08:00 - 22:00 WIB) untuk melayani kendala akun dan informasi pencairan limit.
              </p>
            </div>
            <div>
              <p className="font-extrabold uppercase tracking-wider text-slate-800 mb-2">Legalitas &amp; Hak Cipta</p>
              <p className="text-slate-500">
                © {new Date().getFullYear()} Fastkredit Indonesia. Seluruh hak cipta dilindungi undang-undang. Syarat dan ketentuan berlaku.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Install Prompt untuk PWA */}
      <FloatingInstallButton />
      <PwaInstallGuideModal
        guideMode={guideMode}
        onClose={() => setGuideMode(null)}
        onCopyUrl={handleCopyUrl}
      />
    </div>
  );
}
