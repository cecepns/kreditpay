import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  Save,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Bell,
  FileText,
  FileCheck,
  Check,
  AlertCircle,
  Eye,
} from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ListSkeleton, ErrorState } from "@/components/ui/StateViews";

export default function AdminSettings() {
  const { data, loading, error, reload } = useFetch(API_ENDPOINTS.ADMIN.SETTINGS.GET);
  const [formData, setFormData] = useState({
    whatsapp_number: "",
    whatsapp_message: "",
    app_name: "",
    cs_email: "",
    cs_operational_hours: "",
    notif_acc_title: "",
    notif_acc_message: "",
    letter_company_name: "",
    letter_title: "",
    letter_number_prefix: "",
    letter_opening: "",
    letter_rules_min_topup: "",
    letter_rules_content: "",
    letter_closing: "",
    letter_signer: "",
    letter_important_notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.data?.settings) {
      const s = data.data.settings;
      setFormData({
        whatsapp_number: s.whatsapp_number || "",
        whatsapp_message: s.whatsapp_message || "",
        app_name: s.app_name || "KreditPay",
        cs_email: s.cs_email || "support@kreditpay.com",
        cs_operational_hours: s.cs_operational_hours || "Senin - Minggu: 08:00 - 22:00 WIB",
        notif_acc_title: s.notif_acc_title || "Pengajuan Pinjaman Disetujui (ACC)",
        notif_acc_message:
          s.notif_acc_message ||
          "Selamat {name}! Pengajuan pinjaman Anda sebesar {nominal} telah disetujui (ACC) oleh tim {app_name}.\n\nSaldo limit pinjaman Anda sudah aktif dan dapat digunakan. Akun Anda kini berstatus Terverifikasi. Silakan cek saldo limit Anda di menu Beranda.",
        letter_company_name: s.letter_company_name || "PT KREDITPAY INDONESIA",
        letter_title: s.letter_title || "SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN",
        letter_number_prefix: s.letter_number_prefix || "KP/APP",
        letter_opening:
          s.letter_opening ||
          "Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:",
        letter_rules_min_topup: s.letter_rules_min_topup || "Rp 1.000.000 (satu juta rupiah)",
        letter_rules_content:
          s.letter_rules_content ||
          `- Silakan refresh saldo PayLater Anda\n- Tanda akun Anda aktif yaitu adanya logo "Verifikasi" pada akun Anda.\n- Jika ingin melakukan pencairan saldo PayLater.\n- Nasabah diwajibkan isi saldo ke aplikasi agar fitur menu transfer dan menu-menu lainnya dapat diakses minimal:\n[TOPUP_HIGHLIGHT]\n- Dana top-up nasabah dikirim ke rekening perusahaan sesuai dengan nomor ID akun pemohon.\n- Top-up atau isi saldo ini digunakan untuk membuka dan mengakses menu serta fitur yang ada dalam aplikasi kami.\n- Top-up atau isi saldo ini akan dicairkan bersamaan dengan pencairan PayLater Anda nantinya. "Hanya bersifat sementara". Top-up ini hanya untuk membuka fitur "Transfer" agar limit PayLater Anda bisa dicairkan ke rekening melalui menu transfer.`,
        letter_closing:
          s.letter_closing ||
          "Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}.",
        letter_signer: s.letter_signer || "Tim Operasional",
        letter_important_notes:
          s.letter_important_notes ||
          "Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau password kepada siapapun melalui media lainnya.",
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCleanWaNumber = (num) => {
    if (!num) return "";
    let clean = String(num).replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return clean;
  };

  const cleanNumber = getCleanWaNumber(formData.whatsapp_number);
  const liveWaUrl = cleanNumber
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(formData.whatsapp_message || "")}`
    : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.whatsapp_number.trim()) {
      return toast.error("Nomor WhatsApp wajib diisi");
    }

    setSaving(true);
    try {
      const res = await put(API_ENDPOINTS.ADMIN.SETTINGS.UPDATE, formData);
      toast.success(res.message || "Pengaturan berhasil disimpan");
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Pengaturan Sistem</h1>
          <p className="text-sm font-semibold text-slate-500">Memuat konfigurasi aplikasi...</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <ListSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Pengaturan Sistem</h1>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Pengaturan Kontak &amp; Sistem</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Atur nomor WhatsApp Customer Service untuk tombol &quot;Butuh Bantuan&quot;, pesan template awal, dan informasi kontak aplikasi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Section 1: WhatsApp Support Integration */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800">Layanan WhatsApp Customer Service</h2>
              <p className="text-xs font-semibold text-slate-400">
                Terhubung langsung dengan tombol floating &quot;Butuh Bantuan?&quot; di aplikasi user dan tombol &quot;Live Chat&quot; di Admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                label="Nomor WhatsApp CS"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleChange}
                placeholder="Contoh: 081234567890 atau 6281234567890"
                helper="Bisa menggunakan awalan 08 atau 62. Sistem akan otomatis memformat nomor ke format internasional wa.me."
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                Pesan Template Awal Chat
              </label>
              <textarea
                name="whatsapp_message"
                rows={3}
                value={formData.whatsapp_message}
                onChange={handleChange}
                placeholder="Contoh: Halo Admin KreditPay, saya butuh bantuan terkait akun saya."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400 font-medium">
                Pesan otomatis yang akan langsung terisi saat pengguna mengklik chat WhatsApp.
              </p>
            </div>
          </div>

          {/* WhatsApp Live Preview Box */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Preview Tautan WhatsApp Aktif
              </span>
              {liveWaUrl && (
                <a
                  href={liveWaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Tes Buka WhatsApp
                </a>
              )}
            </div>
            <div className="rounded-xl bg-white p-3 font-mono text-xs text-slate-700 break-all select-all ring-1 ring-emerald-200/50">
              {liveWaUrl || "Masukkan nomor WhatsApp yang valid untuk membuat tautan"}
            </div>
          </div>
        </div>

        {/* Section 2: Informasi Aplikasi & Kontak Pendukung */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800">Informasi Aplikasi &amp; Operasional</h2>
              <p className="text-xs font-semibold text-slate-400">
                Detail kontak pendukung dan jadwal jam operasional layanan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Input
              label="Nama Aplikasi"
              name="app_name"
              value={formData.app_name}
              onChange={handleChange}
              placeholder="KreditPay"
            />
            <Input
              label="Email Dukungan CS"
              name="cs_email"
              type="email"
              value={formData.cs_email}
              onChange={handleChange}
              placeholder="support@kreditpay.com"
            />
            <Input
              label="Jam Operasional CS"
              name="cs_operational_hours"
              value={formData.cs_operational_hours}
              onChange={handleChange}
              placeholder="Senin - Minggu: 08:00 - 22:00 WIB"
            />
          </div>
        </div>

        {/* Section 3: Kustomisasi Template Notifikasi ACC Pinjaman */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Bell className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800">Template Notifikasi ACC Pinjaman</h2>
              <p className="text-xs font-semibold text-slate-400">
                Sesuaikan judul dan isi pesan notifikasi yang akan otomatis dikirimkan ke nasabah ketika pengajuannya disetujui (ACC).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                label="Judul Notifikasi ACC"
                name="notif_acc_title"
                value={formData.notif_acc_title}
                onChange={handleChange}
                placeholder="Contoh: Pengajuan Pinjaman Disetujui (ACC)"
                helper="Judul notifikasi yang tampil tebal pada daftar notifikasi nasabah."
                required
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Isi Pesan Notifikasi ACC
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span>Sisipkan tag:</span>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, notif_acc_message: (p.notif_acc_message || "") + " {name}" }))}
                    className="rounded-lg bg-slate-100 px-2 py-0.5 text-primary-700 hover:bg-primary-50 transition active:scale-95"
                    title="Sisipkan Nama Lengkap Nasabah"
                  >
                    + &#123;name&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, notif_acc_message: (p.notif_acc_message || "") + " {nominal}" }))}
                    className="rounded-lg bg-slate-100 px-2 py-0.5 text-primary-700 hover:bg-primary-50 transition active:scale-95"
                    title="Sisipkan Nominal Pinjaman yang di-ACC"
                  >
                    + &#123;nominal&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, notif_acc_message: (p.notif_acc_message || "") + " {app_name}" }))}
                    className="rounded-lg bg-slate-100 px-2 py-0.5 text-primary-700 hover:bg-primary-50 transition active:scale-95"
                    title="Sisipkan Nama Aplikasi"
                  >
                    + &#123;app_name&#125;
                  </button>
                </div>
              </div>

              <textarea
                name="notif_acc_message"
                rows={5}
                value={formData.notif_acc_message}
                onChange={handleChange}
                placeholder="Tuliskan isi pesan notifikasi saat pinjaman disetujui..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:outline-none leading-relaxed"
                required
              />
              <p className="mt-1 text-xs text-slate-400 font-medium">
                Gunakan <b>&#123;name&#125;</b> untuk nama nasabah, <b>&#123;nominal&#125;</b> untuk nominal pinjaman, dan <b>&#123;app_name&#125;</b> untuk nama aplikasi.
              </p>
            </div>

            {/* Live Simulation Card */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-2">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Simulasi Tampilan Pesan di Akun User
              </span>
              <div className="rounded-2xl border border-emerald-200 border-l-4 border-l-emerald-500 bg-white p-4 shadow-2xs space-y-2">
                <p className="font-extrabold text-sm sm:text-base text-emerald-950">
                  {(formData.notif_acc_title || "Pengajuan Pinjaman Disetujui (ACC)")
                    .replace(/{name}/gi, "Fitrina BR Nasution")
                    .replace(/{nominal}/gi, "Rp 50.000.000")
                    .replace(/{app_name}/gi, formData.app_name || "KreditPay")}
                </p>
                <p className="text-xs text-slate-600 font-medium whitespace-pre-line leading-relaxed">
                  {(formData.notif_acc_message || "Pesan notifikasi...")
                    .replace(/{name}/gi, "Fitrina BR Nasution")
                    .replace(/{nominal}/gi, "Rp 50.000.000")
                    .replace(/{app_name}/gi, formData.app_name || "KreditPay")}
                </p>
                <p className="text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Waktu: Otomatis sesuai jam saat Admin klik ACC</span>
                  <span className="text-emerald-700 font-black">Pratinjau Otomatis</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Kustomisasi Template Surat Persetujuan Pinjaman */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <FileCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                Template Surat Persetujuan Pinjaman (KOP &amp; Aturan Pencairan)
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Atur redaksi kop surat resmi, aturan pencairan limit pinjaman, nominal minimal top-up, stempel, dan penandatangan yang tampil pada dokumen persetujuan nasabah.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                label="Nama Perusahaan (KOP Surat)"
                name="letter_company_name"
                value={formData.letter_company_name}
                onChange={handleChange}
                placeholder="Contoh: PT KREDITPAY INDONESIA"
                helper="Ditampilkan pada KOP atas dan penutup surat."
                required
              />
            </div>

            <div>
              <Input
                label="Prefix / Awalan Nomor Surat"
                name="letter_number_prefix"
                value={formData.letter_number_prefix}
                onChange={handleChange}
                placeholder="Contoh: KP/APP atau SJN/APP"
                helper="Format nomor surat otomatis: [PREFIX]/[BULAN TAHUN]/[NOMOR ID]"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
              Judul Dokumen Surat
            </label>
            <textarea
              name="letter_title"
              rows={2}
              value={formData.letter_title}
              onChange={handleChange}
              placeholder="SURAT PEMBERITAHUAN&#10;PERSETUJUAN PENGAJUAN PINJAMAN"
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-bold text-slate-800 focus:border-primary-500 focus:outline-none uppercase"
              required
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Paragraf Pembuka Surat
              </label>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <span>Sisipkan tag:</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      letter_opening: (p.letter_opening || "") + " {company_name}",
                    }))
                  }
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-primary-700 hover:bg-primary-50 transition active:scale-95"
                >
                  + &#123;company_name&#125;
                </button>
              </div>
            </div>
            <textarea
              name="letter_opening"
              rows={3}
              value={formData.letter_opening}
              onChange={handleChange}
              placeholder="Tuliskan kalimat pembuka surat persetujuan..."
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:outline-none leading-relaxed"
              required
            />
          </div>

          <div>
            <Input
              label="Nominal Syarat Minimal Top-Up Pencairan"
              name="letter_rules_min_topup"
              value={formData.letter_rules_min_topup}
              onChange={handleChange}
              placeholder="Contoh: Rp 1.000.000 (satu juta rupiah)"
              helper="Nominal yang di-highlight merah terang pada poin aturan pencairan."
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Poin-Poin Aturan Pencairan Limit Pinjaman
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Gunakan <b>[TOPUP_HIGHLIGHT]</b> untuk menyisipkan kotak merah nominal top-up
              </span>
            </div>
            <textarea
              name="letter_rules_content"
              rows={9}
              value={formData.letter_rules_content}
              onChange={handleChange}
              placeholder="Masukkan poin-poin instruksi aturan pencairan saldo nasabah..."
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-medium text-slate-800 focus:border-primary-500 focus:outline-none leading-relaxed font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                Paragraf Penutup Surat
              </label>
              <textarea
                name="letter_closing"
                rows={3}
                value={formData.letter_closing}
                onChange={handleChange}
                placeholder="Demikian surat pemberitahuan ini kami sampaikan..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:outline-none leading-relaxed"
                required
              />
            </div>

            <div className="space-y-4">
              <Input
                label="Pihak Penandatangan Surat"
                name="letter_signer"
                value={formData.letter_signer}
                onChange={handleChange}
                placeholder="Contoh: Tim Operasional atau Direktur Operasional"
                required
              />
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                  Informasi Penting / Disclaimer Kaki Dokumen
                </label>
                <textarea
                  name="letter_important_notes"
                  rows={2}
                  value={formData.letter_important_notes}
                  onChange={handleChange}
                  placeholder="Jaga kerahasiaan akun dan data pribadi Anda..."
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-primary-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Pratinjau Dokumen Surat Persetujuan (Live Preview Mirip Tampilan User) */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-950">
                <Eye className="h-4 w-4 text-rose-600" /> Live Preview: Tampilan Surat Pada Modal Nasabah
              </span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-extrabold text-rose-800">
                Format Resmi Dokumen
              </span>
            </div>

            {/* Kertas Dokumen Putih */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5 text-slate-800 text-xs sm:text-sm">
              {/* KOP Surat */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-rose-600 tracking-tight">KreditPay</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                    {formData.letter_company_name || "PT KREDITPAY INDONESIA"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Sistem Layanan Pengajuan Pinjaman Terpadu
                  </p>
                </div>
              </div>

              {/* Judul & Nomor Surat */}
              <div className="text-center space-y-1 pt-1">
                <h3 className="font-black text-sm sm:text-base text-slate-900 uppercase whitespace-pre-line tracking-tight">
                  {formData.letter_title || "SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN"}
                </h3>
                <p className="text-[11px] font-bold text-slate-500">
                  Nomor: {formData.letter_number_prefix || "KP/APP"}/112026/032087
                </p>
              </div>

              {/* Data Nasabah */}
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-500">Kepada Yth.</p>
                <p className="font-black text-slate-900 text-sm">Sandi Saputra</p>
                <div className="grid grid-cols-[100px_10px_1fr] text-slate-600 pt-1">
                  <span>ID Akun</span>
                  <span>:</span>
                  <span className="font-mono font-bold text-slate-800">( KP-0082 )</span>
                  <span>No. Pengajuan</span>
                  <span>:</span>
                  <span className="font-mono font-bold text-slate-800">PINJ-202611-032087</span>
                </div>
              </div>

              {/* Pembuka */}
              <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                <p className="font-semibold">Dengan hormat,</p>
                <p>
                  {(
                    formData.letter_opening ||
                    "Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:"
                  ).replace(/{company_name}/gi, formData.letter_company_name || "PT KREDITPAY INDONESIA")}
                </p>
              </div>

              {/* Tabel Rincian */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Status Pinjaman</span>
                  <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                    Diterima
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Tenor Pinjaman</span>
                  <span className="font-black text-slate-800">12 Bulan</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Cicilan per Bulan</span>
                  <span className="font-black text-slate-800">Rp 425.000</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Tanggal Persetujuan</span>
                  <span className="font-bold text-slate-700">07 November 2026, 19:40 WIB</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-800 font-extrabold">Total Pinjaman Disetujui</span>
                  <span className="text-sm font-black text-rose-600">Rp 5.000.000</span>
                </div>
              </div>

              {/* Box Aturan Pencairan */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-200 text-slate-700">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      ATURAN PENCAIRAN LIMIT PINJAMAN
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Informasi yang perlu diperhatikan sebelum menggunakan fitur pencairan
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
                  {(formData.letter_rules_content || "")
                    .split("\n")
                    .map((line, idx) => {
                      if (line.includes("[TOPUP_HIGHLIGHT]")) {
                        return (
                          <div
                            key={idx}
                            className="my-2 rounded-xl border border-rose-200 bg-rose-50/90 py-2.5 px-4 text-center font-black text-rose-600 text-xs shadow-2xs"
                          >
                            Top-up {formData.letter_rules_min_topup || "Rp 1.000.000 (satu juta rupiah)"}
                          </div>
                        );
                      }
                      if (!line.trim()) return null;
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1 w-1 rounded-full bg-slate-500 shrink-0" />
                          <span>{line.replace(/^-\s*/, "")}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Penutup */}
              <div className="space-y-1 text-xs text-slate-700 leading-relaxed pt-1">
                <p>
                  {(
                    formData.letter_closing ||
                    "Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}."
                  ).replace(/{company_name}/gi, formData.letter_company_name || "PT KREDITPAY INDONESIA")}
                </p>
              </div>

              {/* Tanggal & Tanda Tangan Resmi */}
              <div className="pt-2 text-xs space-y-1">
                <p className="font-bold text-slate-700">07 November 2026</p>
                <p className="text-slate-500">Hormat kami,</p>
                <p className="font-black text-rose-600 uppercase">
                  {formData.letter_company_name || "PT KREDITPAY INDONESIA"}
                </p>

                {/* Stempel Basah Resmi Merah */}
                <div className="py-2">
                  <div className="inline-block -rotate-6 rounded-lg border-2 border-dashed border-rose-600/80 px-4 py-2 text-center text-rose-600 bg-rose-50/30 shadow-2xs select-none">
                    <p className="text-[11px] font-black tracking-widest uppercase">
                      {formData.app_name || "KREDITPAY"}
                    </p>
                    <p className="text-[9px] font-extrabold uppercase">
                      {formData.letter_company_name || "PT KREDITPAY INDONESIA"}
                    </p>
                  </div>
                </div>

                <p className="font-extrabold text-slate-900 pt-1">
                  {formData.letter_signer || "Tim Operasional"}
                </p>
              </div>

              {/* Box Informasi Penting */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1 text-[11px]">
                <p className="font-black text-rose-600 uppercase tracking-wide">
                  INFORMASI PENTING
                </p>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {(
                    formData.letter_important_notes ||
                    "Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau password kepada siapapun melalui media lainnya."
                  ).replace(/{company_name}/gi, formData.letter_company_name || "PT KREDITPAY INDONESIA")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <Button type="submit" icon={Save} loading={saving} className="px-6 py-3 text-base">
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  );
}
