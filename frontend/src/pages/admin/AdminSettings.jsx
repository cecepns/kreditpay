import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MessageSquare, Phone, Mail, Clock, ExternalLink, Save, CheckCircle2, ShieldCheck, HelpCircle, Bell } from "lucide-react";
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
        notif_acc_message: s.notif_acc_message || "Selamat {name}! Pengajuan pinjaman Anda sebesar {nominal} telah disetujui (ACC) oleh tim {app_name}.\n\nSaldo limit pinjaman Anda sudah aktif dan dapat digunakan. Akun Anda kini berstatus Terverifikasi. Silakan cek saldo limit Anda di menu Beranda.",
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
