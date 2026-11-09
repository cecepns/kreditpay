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
  Layers,
  Globe,
} from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ListSkeleton, ErrorState } from "@/components/ui/StateViews";
import ApprovalLetterDocument, { LETTER_MODELS } from "@/components/paylater/ApprovalLetterDocument";

export default function AdminSettings() {
  const { data, loading, error, reload } = useFetch(API_ENDPOINTS.ADMIN.SETTINGS.GET);
  const [formData, setFormData] = useState({
    whatsapp_number: "",
    whatsapp_message: "",
    web_app_url: "",
    app_name: "",
    cs_email: "",
    cs_operational_hours: "",
    notif_acc_title: "",
    notif_acc_message: "",
    letter_layout_model: "model_1",
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
  const [previewModelTab, setPreviewModelTab] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.data?.settings) {
      const s = data.data.settings;
      setFormData({
        whatsapp_number: s.whatsapp_number || "",
        whatsapp_message: s.whatsapp_message || "",
        web_app_url: s.web_app_url || "https://kreditpay.id",
        app_name: s.app_name || "Fastkredit",
        cs_email: s.cs_email || "support@fastkredit.com",
        cs_operational_hours: s.cs_operational_hours || "Senin - Minggu: 08:00 - 22:00 WIB",
        notif_acc_title: s.notif_acc_title || "Pengajuan Pinjaman Disetujui (ACC)",
        notif_acc_message:
          s.notif_acc_message ||
          "Selamat {name}! Pengajuan pinjaman Anda sebesar {nominal} telah disetujui (ACC) oleh tim {app_name}.\n\nSaldo limit pinjaman Anda sudah aktif dan dapat digunakan. Akun Anda kini berstatus Terverifikasi. Silakan cek saldo limit Anda di menu Beranda.",
        letter_layout_model: s.letter_layout_model || "model_1",
        letter_company_name: s.letter_company_name || "PT FASTKREDIT INDONESIA",
        letter_title: s.letter_title || "SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN",
        letter_number_prefix: s.letter_number_prefix || "FK/APP",
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
        <h1 className="text-2xl font-extrabold text-slate-800">Pengaturan URL Web &amp; Sistem</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Section 1: Pengaturan URL Web & Domain Aktif */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Globe className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-black text-slate-800">URL Web App &amp; Domain Aktif</h2>
          </div>

          <Input
            label="URL Web App / Domain Aktif"
            name="web_app_url"
            value={formData.web_app_url || ""}
            onChange={handleChange}
            placeholder="https://kreditpay.id"
          />

          {/* [HIDDEN - BELUM DIGUNAKAN] Preview / Endpoint API WebView Mobile APK & Domain Router
          <div className="rounded-2xl bg-indigo-50/70 p-4 text-xs text-indigo-900 border border-indigo-100/90 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-indigo-950">
              <Globe className="h-4 w-4 text-indigo-600" />
              Endpoint API untuk WebView Mobile APK &amp; Domain Router:
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 font-mono text-[11px]">
              <code className="bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100 text-slate-800 break-all select-all flex-1">
                GET {window.location.origin}/api/settings/public (field: web_app_url)
              </code>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Aplikasi mobile APK atau WebView dapat memanggil endpoint di atas saat inisialisasi aplikasi untuk memuat domain aktif secara dinamis tanpa perlu rilis ulang APK. Apabila pengunjung membuka domain lain, aplikasi web akan langsung mengalihkan (redirect) ke domain aktif yang diisi di atas.
            </p>
          </div>
          */}
        </div>

        {/* Section 2: WhatsApp Support Integration */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-black text-slate-800">Layanan WhatsApp Customer Service</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                label="Nomor WhatsApp CS"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleChange}
                placeholder="Contoh: 081234567890 atau 6281234567890"
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
                placeholder="Contoh: Halo Admin Fastkredit, saya butuh bantuan terkait akun saya."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:outline-none"
              />
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
            <h2 className="text-lg font-black text-slate-800">Informasi Aplikasi &amp; Operasional</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Input
              label="Nama Aplikasi"
              name="app_name"
              value={formData.app_name}
              onChange={handleChange}
              placeholder="Fastkredit"
            />
            <Input
              label="Email Dukungan CS"
              name="cs_email"
              type="email"
              value={formData.cs_email}
              onChange={handleChange}
              placeholder="support@fastkredit.com"
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
            <h2 className="text-lg font-black text-slate-800">Template Notifikasi ACC Pinjaman</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                label="Judul Notifikasi ACC"
                name="notif_acc_title"
                value={formData.notif_acc_title}
                onChange={handleChange}
                placeholder="Contoh: Pengajuan Pinjaman Disetujui (ACC)"
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
                    .replace(/{app_name}/gi, formData.app_name || "Fastkredit")}
                </p>
                <p className="text-xs text-slate-600 font-medium whitespace-pre-line leading-relaxed">
                  {(formData.notif_acc_message || "Pesan notifikasi...")
                    .replace(/{name}/gi, "Fitrina BR Nasution")
                    .replace(/{nominal}/gi, "Rp 50.000.000")
                    .replace(/{app_name}/gi, formData.app_name || "Fastkredit")}
                </p>
                <p className="text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Waktu: Otomatis sesuai jam saat Admin klik ACC</span>
                  <span className="text-emerald-700 font-black">Pratinjau Otomatis</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* [HIDDEN - BELUM DIGUNAKAN] Section 4: Kustomisasi Template Surat Persetujuan Pinjaman & Pilihan Model
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <FileCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                Template Surat Persetujuan Pinjaman &amp; Pilihan Model Desain
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Pilih model desain tampilan surat dan sesuaikan redaksi dokumen resmi yang tampil pada akun nasabah saat pinjaman disetujui (ACC).
              </p>
            </div>
          </div>

          -- Pemilih Model Desain Surat (4 Opsi Desain Berbeda) --
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary-600" />
                PILIH MODEL TAMPILAN SURAT NASABAH
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Model aktif yang akan dilihat oleh nasabah
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {LETTER_MODELS.map((m) => {
                const isSelected = formData.letter_layout_model === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setFormData((p) => ({ ...p, letter_layout_model: m.id }));
                      setPreviewModelTab(m.id);
                    }}
                    className={`relative rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                      <div
                        className={`h-4 w-4 rounded-full border grid place-items-center ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">{m.name}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <Input
                label="Nama Perusahaan (KOP Surat)"
                name="letter_company_name"
                value={formData.letter_company_name}
                onChange={handleChange}
                placeholder="Contoh: PT FASTKREDIT INDONESIA"
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
              helper="Nominal yang di-highlight mencolok pada poin aturan pencairan."
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Poin-Poin Aturan Pencairan Limit Pinjaman
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Gunakan <b>[TOPUP_HIGHLIGHT]</b> untuk menyisipkan kotak sorotan nominal top-up
              </span>
            </div>
            <textarea
              name="letter_rules_content"
              rows={8}
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

          -- Pratinjau Dokumen Surat Persetujuan (Live Switcher Model) --
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                <Eye className="h-4 w-4 text-blue-600" /> Pratinjau Langsung: Surat Persetujuan Nasabah
              </span>

              -- Tab Selector Cepat Preview Model --
              <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                {LETTER_MODELS.map((m) => {
                  const isCurrent = (previewModelTab || formData.letter_layout_model) === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPreviewModelTab(m.id)}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-black transition ${
                        isCurrent
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {m.id === "model_1" && "1. FinTech Modern"}
                      {m.id === "model_2" && "2. Formal Bank"}
                      {m.id === "model_3" && "3. Sertifikat SKPK"}
                      {m.id === "model_reference" && "4. Referensi Merah"}
                    </button>
                  );
                })}
              </div>
            </div>

            -- Dokumen Surat Live Preview --
            <ApprovalLetterDocument
              model={previewModelTab || formData.letter_layout_model || "model_1"}
              template={formData}
              application={{
                id: 87,
                full_name: "Sandi Saputra",
                user_id: 82,
                requested_amount: 5000000,
                requested_tenor: 12,
                monthly_installment: 425000,
                created_at: new Date().toISOString(),
              }}
              userInfo={{
                name: "Sandi Saputra",
                username: "sandi",
              }}
              appName={formData.app_name}
              helpers={{
                formatLetterNumber: (id, dateStr, prefix) =>
                  `${prefix || "KP/APP"}/112026/032087`,
                formatApplicationCode: () => "PINJ-202611-032087",
                formatFormalDate: () => "07 November 2026",
                formatFormalDateTime: () => "07 November 2026, 19:40 WIB",
              }}
            />
          </div>
        </div>
        */}

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
