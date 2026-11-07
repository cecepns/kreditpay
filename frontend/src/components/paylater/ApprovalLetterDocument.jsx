import React from "react";
import {
  Check,
  ShieldCheck,
  Lock,
  FileText,
  Clock,
  Receipt,
  QrCode,
  Award,
  Sparkles,
  CheckCircle2,
  Building2,
  Stamp,
} from "lucide-react";
import { formatRupiah } from "@/utils/format";

export const LETTER_MODELS = [
  {
    id: "model_1",
    name: "Model 1: FinTech Modern (Sertifikat Digital & QR)",
    badge: "Rekomendasi",
    badgeColor: "bg-blue-600 text-white",
    desc: "Desain sertifikat digital modern ala perbankan digital, dilengkapi barcode QR verification, watermark sekuriti, dan kartu rincian elegan.",
  },
  {
    id: "model_2",
    name: "Model 2: Dokumen Resmi Perbankan (Letter of Approval)",
    badge: "Formal Eksekutif",
    badgeColor: "bg-slate-800 text-white",
    desc: "Format surat dinas resmi perbankan nasional dengan KOP garis ganda, nomor surat legal, tabel perbankan, dan materai digital.",
  },
  {
    id: "model_3",
    name: "Model 3: Sertifikat SKPK (Surat Keputusan Pembiayaan)",
    badge: "Sertifikat Eksklusif",
    badgeColor: "bg-emerald-700 text-white",
    desc: "Format sertifikat keputusan pembiayaan dengan ornamen border sekuriti formal, segel keaslian dokumen, dan badge otentikasi limit.",
  },
  {
    id: "model_reference",
    name: "Model 4: Standar Ringkas (Sesuai Referensi Asli)",
    badge: "Klasik Merah",
    badgeColor: "bg-rose-600 text-white",
    desc: "Tampilan dokumen berlatar merah klasik sesuai dengan video referensi awal nasabah.",
  },
];

export default function ApprovalLetterDocument({
  model = "model_1",
  template = {},
  application = {},
  userInfo = {},
  appName = "KreditPay",
  helpers = {},
}) {
  const {
    formatLetterNumber = (id) => `KP/APP/112026/${String(id || 1).padStart(6, "0")}`,
    formatApplicationCode = (id) => `PINJ-202611-${String(id || 1).padStart(6, "0")}`,
    formatFormalDate = () => "07 November 2026",
    formatFormalDateTime = () => "07 November 2026, 19:40 WIB",
  } = helpers;

  const companyName = template.letter_company_name || "PT KREDITPAY INDONESIA";
  const appTitle = appName || template.app_name || "KreditPay";
  const customerName = application.full_name || userInfo.name || "Nasabah";
  const accountId = userInfo.username
    ? userInfo.username.toUpperCase()
    : `KP-${String(application.user_id || userInfo.id || "0082").padStart(4, "0")}`;
  const appNumber = formatLetterNumber(
    application.id,
    application.created_at,
    template.letter_number_prefix
  );
  const appCode = formatApplicationCode(application.id, application.created_at);
  const tenor = application.requested_tenor || 12;
  const nominal = Number(application.requested_amount || 5000000);
  const installment = Number(application.monthly_installment || Math.round(nominal / tenor));
  const minTopUp = template.letter_rules_min_topup || "Rp 1.000.000 (satu juta rupiah)";
  const signer = template.letter_signer || "Tim Operasional";

  const renderRulesLines = (highlightClassName) => {
    return (template.letter_rules_content || "")
      .split("\n")
      .map((line, idx) => {
        if (line.includes("[TOPUP_HIGHLIGHT]")) {
          return (
            <div key={idx} className={highlightClassName}>
              Top-up {minTopUp}
            </div>
          );
        }
        if (!line.trim()) return null;
        return (
          <div key={idx} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" />
            <span className="leading-relaxed">{line.replace(/^-\s*/, "")}</span>
          </div>
        );
      });
  };

  /* ─────────────────────────────────────────────────────────────
     MODEL 1: FINTECH MODERN (Sertifikat Digital & QR Verification)
     ───────────────────────────────────────────────────────────── */
  if (model === "model_1") {
    return (
      <div className="relative rounded-3xl border border-blue-100 bg-white p-6 sm:p-8 shadow-sm text-slate-800 text-xs sm:text-sm overflow-hidden space-y-6">
        {/* Ambient Watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none rotate-[-25deg]">
          <span className="text-8xl sm:text-9xl font-black uppercase tracking-widest text-blue-900">
            VERIFIED
          </span>
        </div>

        {/* Top Header KOP FinTech */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-blue-600 px-3 py-1 text-sm font-black text-white tracking-wider">
                {appTitle}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700 border border-blue-200">
                <ShieldCheck className="h-3 w-3 text-blue-600" /> Official Loan Certificate
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
              {companyName}
            </p>
            <p className="text-[10px] text-slate-400">
              Layanan Pembiayaan Digital Terintegrasi &amp; Terpercaya
            </p>
          </div>

          {/* QR Code Keaslian Dokumen */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 shadow-2xs">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-600 shadow-2xs border border-slate-100">
              <QrCode className="h-6 w-6 stroke-[1.8]" />
            </div>
            <div className="text-[10px] space-y-0.5">
              <span className="block font-black text-slate-700 uppercase tracking-wider">Digital Verified</span>
              <span className="block font-mono text-[9px] text-slate-400">HASH: KP-SEC-{String(application.id || 1).padStart(4, "0")}</span>
            </div>
          </div>
        </div>

        {/* Judul & Nomor Dokumen */}
        <div className="relative z-10 text-center space-y-1 pt-1">
          <span className="inline-block rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">
            Surat Keputusan Sah
          </span>
          <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight whitespace-pre-line">
            {template.letter_title || "SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN"}
          </h3>
          <p className="text-[11px] font-bold text-slate-500 font-mono">
            No. Dokumen: <b className="text-slate-800">{appNumber}</b>
          </p>
        </div>

        {/* Profil Nasabah Card */}
        <div className="relative z-10 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-slate-50 p-4 border border-blue-100/90 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Nasabah Pemohon</span>
              <p className="text-sm font-black text-slate-900">{customerName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor Registrasi Akun</span>
              <p className="text-xs font-black font-mono text-blue-700">( {accountId} )</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kode Pengajuan Resmi</span>
              <p className="text-xs font-black font-mono text-slate-800">{appCode}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal &amp; Waktu Persetujuan</span>
              <p className="text-xs font-bold text-slate-800">{formatFormalDateTime(application.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Paragraf Pembuka */}
        <div className="relative z-10 space-y-1.5 text-slate-700 leading-relaxed text-xs">
          <p className="font-semibold text-slate-900">Dengan hormat,</p>
          <p>
            {(
              template.letter_opening ||
              "Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:"
            ).replace(/{company_name}/gi, companyName)}
          </p>
        </div>

        {/* 4 Metric Stats Grid (Fintech Cards) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-800">Status</span>
            <div className="flex items-center justify-center gap-1 font-black text-emerald-700 text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4" /> DITERIMA
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-800">Tenor Kredit</span>
            <p className="font-black text-blue-900 text-xs sm:text-sm">{tenor} Bulan</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Angsuran / Bln</span>
            <p className="font-black text-slate-800 text-xs sm:text-sm">{formatRupiah(installment)}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-600 p-3 text-center space-y-1 text-white shadow-sm">
            <span className="text-[10px] font-bold uppercase text-blue-100">Total Plafond</span>
            <p className="font-black text-xs sm:text-sm">{formatRupiah(nominal)}</p>
          </div>
        </div>

        {/* Box Aturan Pencairan Modern */}
        <div className="relative z-10 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Receipt className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                PETUNJUK &amp; ATURAN PENCAIRAN FASILITAS PINJAMAN
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                Harap perhatikan seluruh ketentuan berikut sebelum melakukan pencairan dana
              </p>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
            {renderRulesLines(
              "my-2.5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 py-3 px-4 text-center font-black text-blue-700 text-xs sm:text-sm shadow-xs"
            )}
          </div>
        </div>

        {/* Penutup */}
        <div className="relative z-10 space-y-1 text-xs text-slate-700 leading-relaxed pt-1">
          <p>
            {(
              template.letter_closing ||
              "Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}."
            ).replace(/{company_name}/gi, companyName)}
          </p>
        </div>

        {/* Pengesahan Stempel Lingkaran FinTech Biru & Emas */}
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Pengesahan</p>
            <p className="font-bold text-slate-800">{formatFormalDate(application.created_at)}</p>
            <p className="text-[11px] font-semibold text-slate-500">Divisi Operasional &amp; Manajemen Risiko</p>
            <p className="font-black text-blue-600 uppercase tracking-wide">{companyName}</p>
          </div>

          {/* Stempel Lingkaran Resmi Digital */}
          <div className="relative flex items-center justify-center p-1">
            <div className="relative flex flex-col items-center justify-center h-24 w-24 rounded-full border-2 border-dashed border-blue-600/90 bg-blue-50/40 text-center text-blue-700 rotate-[-6deg] shadow-xs select-none">
              <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">★ VERIFIED ★</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{appTitle}</span>
              <span className="text-[7px] font-bold uppercase tracking-tight text-blue-600">DIVISI KREDIT</span>
              <span className="text-[6px] font-semibold uppercase">{companyName}</span>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400">Verifikator Resmi</p>
            <p className="text-sm font-black text-slate-900">{signer}</p>
            <p className="text-[9px] font-mono text-emerald-600 font-bold">DIGITALLY SIGNED &bull; OK</p>
          </div>
        </div>

        {/* Box Footer Informasi Penting */}
        <div className="relative z-10 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3.5 space-y-1 text-[11px]">
          <span className="flex items-center gap-1.5 font-black text-blue-800 uppercase tracking-wide">
            <Lock className="h-3.5 w-3.5 text-blue-600" /> INFORMASI PENTING
          </span>
          <p className="text-slate-600 font-medium leading-relaxed">
            {(
              template.letter_important_notes ||
              "Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau password kepada siapapun melalui media lainnya."
            ).replace(/{company_name}/gi, companyName)}
          </p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     MODEL 2: DOKUMEN RESMI PERBANKAN (Classic Formal Banking)
     ───────────────────────────────────────────────────────────── */
  if (model === "model_2") {
    return (
      <div className="rounded-3xl border-2 border-slate-300 bg-[#FCFDFD] p-6 sm:p-9 shadow-sm text-slate-900 text-xs sm:text-sm space-y-6 font-serif">
        {/* KOP Surat Dinas Garis Ganda Formal */}
        <div className="border-b-4 border-double border-slate-900 pb-4 space-y-1">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-slate-950 font-sans">
                {companyName}
              </h2>
              <p className="text-[11px] font-sans font-semibold text-slate-600">
                Lembaga Fasilitas Pembiayaan &amp; Penyaluran Kredit Dana Tunai
              </p>
            </div>
            <div className="text-right font-sans text-[10px] text-slate-500 leading-tight">
              <p>Kantor Operasional Pusat</p>
              <p>Layanan Hotline: 0812-0000-0000</p>
              <p>Website: www.kreditpay.co.id</p>
            </div>
          </div>
        </div>

        {/* Header Meta Surat Resmi */}
        <div className="grid grid-cols-[100px_10px_1fr] gap-y-1 text-xs font-sans text-slate-700">
          <span className="font-bold">Nomor</span>
          <span>:</span>
          <span className="font-mono font-bold text-slate-900">{appNumber}</span>

          <span className="font-bold">Sifat</span>
          <span>:</span>
          <span className="font-semibold text-rose-700 uppercase">Penting / Rahasia</span>

          <span className="font-bold">Lampiran</span>
          <span>:</span>
          <span>1 (Satu) Lembar Dokumen Pelaksanaan Fasilitas</span>

          <span className="font-bold">Perihal</span>
          <span>:</span>
          <span className="font-black text-slate-950 uppercase">
            Pemberitahuan Persetujuan Fasilitas Pinjaman (Letter of Approval)
          </span>
        </div>

        {/* Tujuan Surat */}
        <div className="font-sans text-xs space-y-1 pt-1">
          <p className="font-semibold text-slate-600">Kepada Yang Terhormat,</p>
          <p className="text-base font-black text-slate-950">{customerName}</p>
          <p className="text-slate-600">
            ID Pemohon: <b className="text-slate-900 font-mono">( {accountId} )</b> &bull; No. Registrasi: <b className="text-slate-900 font-mono">{appCode}</b>
          </p>
        </div>

        {/* Pembuka */}
        <div className="space-y-2 text-justify leading-relaxed text-xs sm:text-[13px] text-slate-800">
          <p className="font-bold">Dengan hormat,</p>
          <p>
            Sehubungan dengan permohonan pengajuan fasilitas pinjaman yang Saudara/i ajukan melalui sistem <b>{appTitle}</b> ({companyName}), setelah melalui proses verifikasi data, kelayakan dokumen, serta uji analisa kemampuan finansial, dengan ini kami memberitahukan bahwa permohonan Saudara/i telah <b>DISETUJUI</b> dengan ketentuan rincian pembiayaan sebagai berikut:
          </p>
        </div>

        {/* Tabel Resmi Perbankan */}
        <div className="font-sans overflow-hidden rounded-xl border border-slate-900 text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 text-left border-r border-slate-900 font-black">Komponen Fasilitas</th>
                <th className="py-2.5 px-3 text-left font-black">Keterangan / Nilai Persetujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-300 bg-slate-50/50">Status Keputusan</td>
                <td className="py-2 px-3 font-black text-emerald-800">DISETUJUI &bull; DITERIMA AKTIF</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-300 bg-slate-50/50">Total Plafond Pembiayaan</td>
                <td className="py-2 px-3 font-black text-base text-slate-950">{formatRupiah(nominal)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-300 bg-slate-50/50">Jangka Waktu (Tenor)</td>
                <td className="py-2 px-3 font-bold text-slate-800">{tenor} Bulan</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-300 bg-slate-50/50">Angsuran per Bulan</td>
                <td className="py-2 px-3 font-black text-slate-900">{formatRupiah(installment)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-300 bg-slate-50/50">Tanggal Efektif Persetujuan</td>
                <td className="py-2 px-3 font-bold text-slate-800">{formatFormalDateTime(application.created_at)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Box Ketentuan & Aturan Pencairan */}
        <div className="font-sans rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:p-5 space-y-3 text-xs">
          <h4 className="font-black uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-700" /> KLAUSUL &amp; ATURAN PENCAIRAN SALDO PEMBIAYAAN
          </h4>
          <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
            {renderRulesLines(
              "my-2 rounded-xl border-2 border-slate-800 bg-white py-2.5 px-4 text-center font-black text-slate-950 text-xs sm:text-sm shadow-xs"
            )}
          </div>
        </div>

        {/* Penutup */}
        <div className="space-y-1 text-justify text-xs leading-relaxed">
          <p>
            Demikian surat pemberitahuan persetujuan ini kami sampaikan agar dipergunakan sebagaimana mestinya. Atas kerja sama dan kepercayaan yang diberikan, kami ucapkan terima kasih.
          </p>
        </div>

        {/* Tanda Tangan & Materai */}
        <div className="font-sans pt-4 flex flex-wrap items-end justify-between gap-6 border-t border-slate-200 text-xs">
          <div>
            <p className="text-slate-500">Ditetapkan pada tanggal:</p>
            <p className="font-bold text-slate-900">{formatFormalDate(application.created_at)}</p>
            <p className="mt-3 font-semibold text-slate-700">Hormat Kami,</p>
            <p className="font-black uppercase text-slate-950">{companyName}</p>

            {/* Cap Stempel Dinas Kotak */}
            <div className="my-2 inline-block -rotate-3 border-2 border-slate-900 p-2 text-center text-slate-900 font-bold uppercase text-[9px] bg-slate-100/60 shadow-2xs">
              <p className="tracking-widest">{appTitle} OFFICIAL</p>
              <p className="text-[7px] font-normal">OPERATIONAL &amp; AUDIT VERIFIED</p>
            </div>

            <p className="font-black underline text-slate-950">{signer}</p>
            <p className="text-[10px] text-slate-500">Head of Operations &amp; Risk Analyst</p>
          </div>

          {/* Materai Digital Formal */}
          <div className="flex flex-col items-center justify-center h-20 w-24 rounded-lg border border-dashed border-slate-400 bg-amber-50/50 p-2 text-center text-amber-900 text-[9px] select-none shadow-2xs">
            <span className="font-black tracking-wider uppercase text-[8px]">MATERAI ELEKTRONIK</span>
            <span className="text-xs font-black">10000</span>
            <span className="text-[7px] text-slate-500 font-mono">TGL: {formatFormalDate(application.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     MODEL 3: SERTIFIKAT SKPK (Surat Keputusan Pembiayaan)
     ───────────────────────────────────────────────────────────── */
  if (model === "model_3") {
    return (
      <div className="relative rounded-3xl border-4 border-emerald-800/80 bg-gradient-to-b from-emerald-50/30 via-white to-amber-50/20 p-6 sm:p-9 shadow-sm text-slate-900 text-xs sm:text-sm space-y-6">
        {/* Inner Guilloche Border */}
        <div className="pointer-events-none absolute inset-2 rounded-2xl border border-dashed border-emerald-600/30" />

        {/* Header Sertifikat dengan Medali Kehormatan */}
        <div className="relative z-10 text-center space-y-2 border-b-2 border-emerald-800 pb-4">
          <div className="flex items-center justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-800 text-amber-300 shadow-md">
              <Award className="h-7 w-7" />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
              REPUBLIK INDONESIA &bull; DOKUMEN RESMI OTENTIK
            </p>
            <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 font-serif">
              SURAT KEPUTUSAN PERSETUJUAN KREDIT (SKPK)
            </h2>
            <p className="text-xs font-bold text-slate-600 font-mono">
              NOMOR: {appNumber}
            </p>
          </div>
        </div>

        {/* Diberikan Kepada */}
        <div className="relative z-10 text-center space-y-1.5 py-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Fasilitas Pinjaman ini Diberikan Sah Kepada:
          </span>
          <h3 className="text-lg sm:text-2xl font-black text-emerald-950 uppercase tracking-tight">
            {customerName}
          </h3>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-600 font-mono">
            <span>ID AKUN: <b>{accountId}</b></span>
            <span>&bull;</span>
            <span>NO. PENGAJUAN: <b>{appCode}</b></span>
          </div>
        </div>

        {/* Ringkasan Sertifikat Limit */}
        <div className="relative z-10 rounded-2xl border-2 border-emerald-700 bg-emerald-900 p-5 text-white shadow-md text-center space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">
            TOTAL PLAFOND LIMIT DISETUJUI (ACC)
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
            {formatRupiah(nominal)}
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-emerald-100 pt-1 border-t border-emerald-800/80">
            <span>Tenor: <b>{tenor} Bulan</b></span>
            <span>&bull;</span>
            <span>Cicilan: <b>{formatRupiah(installment)} / Bulan</b></span>
          </div>
        </div>

        {/* Pembuka SKPK */}
        <div className="relative z-10 text-justify text-xs text-slate-700 leading-relaxed">
          <p>
            Menyatakan bahwa nasabah tersebut di atas telah memenuhi kriteria dan persyaratan kelayakan pembiayaan pada <b>{companyName}</b>. Saldo pembiayaan yang tercantum pada dokumen ini telah dialokasikan dan siap dicairkan ke rekening bank nasabah sesuai ketentuan perusahaan.
          </p>
        </div>

        {/* Petunjuk Pencairan */}
        <div className="relative z-10 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 border-b border-emerald-100 pb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> SYARAT &amp; KETENTUAN PENCAIRAN SALDO
          </h4>
          <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
            {renderRulesLines(
              "my-2 rounded-xl border border-amber-300 bg-amber-50/80 py-2.5 px-4 text-center font-black text-amber-900 text-xs sm:text-sm shadow-2xs"
            )}
          </div>
        </div>

        {/* Segel Keaslian Dokumen & Pengesahan */}
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 pt-3 border-t border-emerald-200 text-xs">
          <div className="space-y-1">
            <p className="font-bold text-slate-800">{formatFormalDate(application.created_at)}</p>
            <p className="text-slate-500">Diterbitkan oleh:</p>
            <p className="font-black text-emerald-900 uppercase">{companyName}</p>
            <p className="font-bold text-slate-900 pt-2 underline">{signer}</p>
            <p className="text-[10px] text-slate-500">Komite Kredit &amp; Operasional</p>
          </div>

          {/* Stempel Segel Emas Bulat */}
          <div className="flex flex-col items-center justify-center h-24 w-24 rounded-full border-4 border-double border-amber-600 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 text-amber-950 shadow-md text-center p-1 select-none rotate-6">
            <span className="text-[7px] font-black uppercase tracking-widest">OFFICIAL SEAL</span>
            <span className="text-[10px] font-black tracking-tight">{appTitle}</span>
            <span className="text-[6px] font-extrabold uppercase">VALID CERTIFIED</span>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     MODEL 4: MODEL REFERENSI ASLI (Sesuai Referensi Gambar User)
     ───────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-5 text-slate-800 text-xs sm:text-sm leading-relaxed">
      {/* KOP Surat Merah Klasik */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black text-[#E11D48] tracking-tighter">
            {appTitle}
          </span>
        </div>
        <div className="text-right">
          <p className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
            {companyName}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Pemberitahuan Sistem Pengajuan Pinjaman
          </p>
        </div>
      </div>

      {/* Judul & Nomor Surat */}
      <div className="text-center space-y-1 pt-1">
        <h4 className="font-black text-sm sm:text-base text-slate-900 uppercase whitespace-pre-line tracking-tight">
          {template.letter_title || "SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN"}
        </h4>
        <p className="text-[11px] font-bold text-slate-500">
          Nomor: {appNumber}
        </p>
      </div>

      {/* Data Nasabah */}
      <div className="space-y-1.5 text-xs">
        <p className="font-semibold text-slate-500">Kepada Yth.</p>
        <p className="font-black text-slate-900 text-sm">{customerName}</p>
        <div className="grid grid-cols-[100px_10px_1fr] gap-y-0.5 text-slate-600 pt-1">
          <span>ID Akun</span>
          <span>:</span>
          <span className="font-mono font-bold text-slate-800">( {accountId} )</span>
          <span>No. Pengajuan</span>
          <span>:</span>
          <span className="font-mono font-bold text-slate-800">{appCode}</span>
        </div>
      </div>

      {/* Paragraf Pembuka */}
      <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
        <p className="font-semibold">Dengan hormat,</p>
        <p>
          {(
            template.letter_opening ||
            "Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:"
          ).replace(/{company_name}/gi, companyName)}
        </p>
      </div>

      {/* Tabel Rincian Pinjaman */}
      <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500 font-semibold">Status Pinjaman</span>
          <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
            Diterima
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500 font-semibold">Tenor Pinjaman</span>
          <span className="font-black text-slate-800">{tenor} Bulan</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500 font-semibold">Cicilan per Bulan</span>
          <span className="font-black text-slate-800">{formatRupiah(installment)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500 font-semibold">Tanggal Persetujuan</span>
          <span className="font-bold text-slate-700">{formatFormalDateTime(application.created_at)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-slate-800 font-extrabold">Total Pinjaman Disetujui</span>
          <span className="text-sm sm:text-base font-black text-slate-900">{formatRupiah(nominal)}</span>
        </div>
      </div>

      {/* Bagian Aturan Pencairan */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-200 text-slate-700">
            <Receipt className="h-3.5 w-3.5" />
          </span>
          <div>
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-900">
              ATURAN PENCAIRAN LIMIT PINJAMAN
            </h5>
            <p className="text-[10px] text-slate-400 font-medium">
              Informasi yang perlu diperhatikan sebelum menggunakan fitur pencairan
            </p>
          </div>
        </div>

        <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
          {renderRulesLines(
            "my-2 rounded-xl border border-rose-200 bg-rose-50/90 py-2.5 px-4 text-center font-black text-rose-600 text-xs shadow-2xs"
          )}
        </div>
      </div>

      {/* Penutup */}
      <div className="space-y-1 text-xs text-slate-700 leading-relaxed pt-1">
        <p>
          {(
            template.letter_closing ||
            "Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}."
          ).replace(/{company_name}/gi, companyName)}
        </p>
      </div>

      {/* Tanggal & Tanda Tangan Resmi */}
      <div className="pt-2 text-xs space-y-1">
        <p className="font-bold text-slate-700">{formatFormalDate(application.created_at)}</p>
        <p className="text-slate-500">Hormat kami,</p>
        <p className="font-black text-[#E11D48] uppercase">{companyName}</p>

        {/* Stempel Basah Resmi Merah */}
        <div className="py-2">
          <div className="inline-block -rotate-6 rounded-lg border-2 border-dashed border-[#E11D48]/80 px-4 py-2 text-center text-[#E11D48] bg-rose-50/40 shadow-2xs select-none">
            <p className="text-[11px] font-black tracking-widest uppercase">{appTitle}</p>
            <p className="text-[9px] font-extrabold uppercase">{companyName}</p>
          </div>
        </div>

        <p className="font-extrabold text-slate-900 pt-1">{signer}</p>
      </div>

      {/* Box Informasi Penting */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1 text-[11px]">
        <p className="font-black text-[#E11D48] uppercase tracking-wide">
          INFORMASI PENTING
        </p>
        <p className="text-slate-600 font-medium leading-relaxed">
          {(
            template.letter_important_notes ||
            "Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau password kepada siapapun melalui media lainnya."
          ).replace(/{company_name}/gi, companyName)}
        </p>
      </div>
    </div>
  );
}

