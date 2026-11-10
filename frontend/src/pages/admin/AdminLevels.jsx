import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowLeftRight, Edit3, Eye, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import useFetch from "@/hooks/useFetch";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LevelLockModal from "@/components/dashboard/LevelLockModal";
import { USER_LEVELS } from "@/constants/levels";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";

export default function AdminLevels() {
  const { data: levelsData, reload: reloadLevels } = useFetch(API_ENDPOINTS.LEVELS.LIST);

  const [editingLevel, setEditingLevel] = useState(null);
  const [savingLevel, setSavingLevel] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    subtitle: "",
    message: "",
    note: "",
    button_text: "",
    secondary_button_text: "",
    detail_title: "",
    detail_content: "",
    l2_detail_warning: "",
    detail_sec1_header: "",
    detail_sec1_body: "",
    detail_sec2_header: "",
    detail_sec2_body: "",
    fee_warning: "",
    fee_amount: 100000,
  });

  const [previewState, setPreviewState] = useState(null);
  const [previewActiveLevel, setPreviewActiveLevel] = useState(4);

  const levelConfigs = levelsData?.data || [];
  const configMap = levelConfigs.reduce((acc, cur) => {
    if (cur && cur.level) acc[cur.level] = cur;
    return acc;
  }, {});

  const handleOpenEditModal = (item) => {
    const cfg = configMap[item.level] || {};
    let d1Header = "Mengapa perlu Asuransi?";
    let d1Body = "Sesuai dengan kebijakan keamanan transaksi tingkat tinggi (Level 3+), pencairan dana memerlukan Deposit Asuransi Sementara. Ini bertujuan untuk memverifikasi bahwa rekening penerima adalah valid dan aktif.";
    let d2Header = "Apakah Dana Kembali?";
    let d2Body = "YA, 100% KEMBALI. Dana asuransi ini bersifat Refundable. Setelah sistem berhasil memverifikasi transfer masuk, dana asuransi akan otomatis dikembalikan ke saldo akun Anda dalam waktu 10-30 menit bersamaan dengan dana transfer Anda.";

    let feeWarning = "Perpindahan Saldo Pinjaman ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\n\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.";
    let feeAmount = 100000;

    try {
      if (typeof cfg.detail_content === "string") {
        if (cfg.detail_content.trim().startsWith("[")) {
          const parsed = JSON.parse(cfg.detail_content);
          if (parsed[0]) {
            d1Header = parsed[0].header || d1Header;
            d1Body = parsed[0].body || d1Body;
          }
          if (parsed[1]) {
            d2Header = parsed[1].header || d2Header;
            d2Body = parsed[1].body || d2Body;
          }
        } else if (cfg.detail_content.trim().startsWith("{")) {
          const parsed = JSON.parse(cfg.detail_content);
          if (parsed.fee_warning) feeWarning = parsed.fee_warning;
          if (parsed.fee_amount) feeAmount = Number(parsed.fee_amount) || 100000;
        }
      }
    } catch {
      // fallback
    }

    setEditingLevel(item);
    setEditForm({
      title: cfg.title || (
        item.level >= 4
          ? 'Transfer Saldo <br><span class="text-teal-400">Pinjaman Sedang Proses</span>'
          : item.level === 3
          ? "Transfer ke Rekening"
          : item.level === 2
          ? "Rekening Belum Terintegrasi Autodebet"
          : "Fitur Terkunci"
      ),
      subtitle: cfg.subtitle || (item.level >= 4 ? "PINDAH SALDO" : item.level === 3 ? "ANDA TERTUNDA" : item.subtitle),
      message: cfg.message || (
        item.level >= 4
          ? "Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem."
          : item.level === 3
          ? "Sistem keamanan kami menahan transaksi ini karena memerlukan Verifikasi Asuransi pada akun Anda. Mohon selesaikan administrasi asuransi agar dana dapat dicairkan ke rekening tujuan dengan aman."
          : item.level === 2
          ? "Autodebet adalah sistem pembayaran otomatis yang memungkinkan saldo Anda terpotong langsung untuk membayar tagihan tepat waktu."
          : "Maaf, Anda masih berada di Level 1. Silakan Top Up saldo untuk membuka fitur ini."
      ),
      note: cfg.note || (
        item.level >= 4
          ? "Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi."
          : item.level === 2
          ? "Fitur ini wajib diaktifkan demi keamanan dan kelancaran transaksi Anda."
          : ""
      ),
      button_text: cfg.button_text || (
        item.level >= 4
          ? "Pindahkan Saldo"
          : item.level === 3
          ? "Cek Detail Keterangan"
          : item.level === 2
          ? "Lanjutkan Integrasi"
          : "Top Up Sekarang"
      ),
      secondary_button_text: cfg.secondary_button_text || (item.level >= 4 ? "Batal" : item.level === 3 ? "Batalkan Transaksi" : "Kembali"),
      detail_title:
        cfg.detail_title && !(item.level === 2 && cfg.detail_title === "Ketentuan Integrasi Autodebet")
          ? cfg.detail_title
          : item.level >= 4
          ? "Rincian Perpindahan"
          : item.level === 3
          ? "Ketentuan Asuransi Dana"
          : item.level === 2
          ? "Rekening Belum Diintegrasikan"
          : "Detail Ketentuan",
      detail_content: (() => {
        const raw = typeof cfg.detail_content === "string" ? cfg.detail_content.trim() : "";
        if (item.level === 2) {
          if (raw.startsWith("{")) {
            try {
              const p = JSON.parse(raw);
              return p.message || "Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya.";
            } catch {
              // ignore
            }
          }
          if (!raw || raw.includes("Sistem autodebet memastikan") || raw.includes("Sistem autodebet memerlukan")) {
            return "Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya.";
          }
          return raw;
        }
        return raw && !raw.startsWith("{") && !raw.startsWith("[")
          ? raw
          : "Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya.";
      })(),
      l2_detail_warning: (() => {
        const defWarn =
          "Silakan lakukan Top Up Saldo minimal satu kali untuk mengaktifkan fitur transfer dan mengintegrasikan rekening Anda secara otomatis.";
        if (item.level !== 2 || typeof cfg.detail_content !== "string") return defWarn;
        try {
          if (cfg.detail_content.trim().startsWith("{")) {
            const p = JSON.parse(cfg.detail_content);
            return p.warning || defWarn;
          }
        } catch {
          // ignore
        }
        return defWarn;
      })(),
      detail_sec1_header: d1Header,
      detail_sec1_body: d1Body,
      detail_sec2_header: d2Header,
      detail_sec2_body: d2Body,
      fee_warning: feeWarning,
      fee_amount: feeAmount,
    });
  };

  const handleSaveLevelConfig = async (e) => {
    e.preventDefault();
    if (!editingLevel) return;
    setSavingLevel(true);
    try {
      let detailContentValue = "";

      if (editingLevel.level >= 4) {
        detailContentValue = JSON.stringify({
          fee_warning: editForm.fee_warning,
          fee_amount: Number(editForm.fee_amount) || 100000,
        });
      } else if (editingLevel.level === 3) {
        detailContentValue = JSON.stringify([
          { header: editForm.detail_sec1_header, body: editForm.detail_sec1_body },
          { header: editForm.detail_sec2_header, body: editForm.detail_sec2_body },
        ]);
      } else if (editingLevel.level === 2) {
        detailContentValue = JSON.stringify({
          message: editForm.detail_content || "",
          warning: editForm.l2_detail_warning || "",
        });
      } else {
        detailContentValue = editForm.detail_title || "";
      }

      const payload = {
        title: editForm.title,
        subtitle: editForm.subtitle,
        message: editForm.message,
        note: editForm.note,
        button_text: editForm.button_text,
        secondary_button_text: editForm.secondary_button_text,
        detail_title: editForm.detail_title,
        detail_content: detailContentValue,
      };

      const res = await put(API_ENDPOINTS.LEVELS.UPDATE(editingLevel.level), payload);
      toast.success(res.message || `Pengaturan Level ${editingLevel.level} berhasil disimpan`);
      setEditingLevel(null);
      reloadLevels();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan pengaturan level");
    } finally {
      setSavingLevel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GAMBAR 4: Top Header */}
      <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Master Level</h1>
            <p className="text-xs font-black uppercase tracking-wider text-primary-700">
              Editor Halaman &amp; Hak Akses
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-primary-50 px-4 py-2 text-xs font-bold text-primary-700">
          <Sparkles className="h-4 w-4" />
          <span>7 Konfigurasi Level Siap Pakai</span>
        </div>
      </div>

      <p className="px-2 text-xs font-semibold text-slate-500">
        Kelola judul, pesan pop-up, teks tombol, dan rincian perpindahan dana untuk Level 1 sampai 7. Setiap perubahan langsung aktif di aplikasi pengguna.
      </p>

      {/* GAMBAR 4: Grid Level 1 sampai Level 7 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {USER_LEVELS.map((item) => {
          const Icon = item.icon;
          const cfg = configMap[item.level] || {};
          const displayTitle = (cfg.title || item.title).replace(/<[^>]*>/g, " ");
          const displaySubtitle = cfg.subtitle || item.subtitle;
          const displayMessage = cfg.message || item.description;

          return (
            <div
              key={item.level}
              className="group relative flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-primary-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl ${item.tone} transition group-hover:scale-105`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
                    Level {item.level}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-black text-slate-900 line-clamp-1">{displayTitle}</h3>
                <p className="text-xs font-bold text-amber-600">{displaySubtitle}</p>
                <p className="mt-2 line-clamp-3 text-xs font-medium text-slate-500">
                  {displayMessage}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit3}
                  onClick={() => handleOpenEditModal(item)}
                  className="flex-1 text-xs font-bold"
                >
                  Edit Teks
                </Button>

                {item.level === 1 ? (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={Eye}
                    onClick={() => setPreviewState("level1")}
                    className="text-xs font-bold"
                  >
                    Lihat
                  </Button>
                ) : item.level === 2 ? (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={Eye}
                    onClick={() => setPreviewState("level2_transfer")}
                    className="text-xs font-bold"
                  >
                    Lihat
                  </Button>
                ) : item.level === 3 ? (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={Eye}
                    onClick={() => setPreviewState("level3_tertunda")}
                    className="text-xs font-bold text-amber-600"
                  >
                    Lihat
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={Eye}
                    onClick={() => {
                      setPreviewActiveLevel(item.level);
                      setPreviewState("pindah_saldo");
                    }}
                    className="text-xs font-bold text-teal-600"
                  >
                    Lihat
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Edit Pesan / Teks Level */}
      <Modal
        open={!!editingLevel}
        onClose={() => setEditingLevel(null)}
        title={
          editingLevel?.level >= 4
            ? `Editor Level ${editingLevel?.level}`
            : `Edit Pesan & Teks Level ${editingLevel?.level}: ${editingLevel?.title}`
        }
      >
        <form onSubmit={handleSaveLevelConfig} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* GAMBAR 4: Tampilan Khusus Level 4, 5, 6, 7 (Editor Level 4 - Pindah Saldo) */}
          {editingLevel?.level >= 4 ? (
            <div className="space-y-4">
              {/* Badge Subtitle Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-teal-600">
                  {editingLevel?.subtitle || "PINDAH SALDO"}
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
              </div>

              {/* Card Banner Hijau */}
              <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
                <h4 className="text-sm font-black text-teal-900">
                  Edit Halaman Pindah Saldo
                </h4>
                <p className="text-xs font-semibold text-teal-700/80 mt-0.5">
                  Sesuaikan teks yang muncul saat pengguna mengklik menu transfer.
                </p>
              </div>

              {/* 1. JUDUL HALAMAN (SUPPORT HTML) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  JUDUL HALAMAN (SUPPORT HTML)
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder='Transfer Saldo <br><span class="text-teal-400">Pinjaman Sedang Proses</span>'
                  required
                />
              </div>

              {/* 2. DESKRIPSI UTAMA */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  DESKRIPSI UTAMA
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.message}
                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem."
                  required
                />
              </div>

              {/* 3. INFO TAMBAHAN (TEKS BAWAH) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  INFO TAMBAHAN (TEKS BAWAH)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi."
                />
              </div>

              {/* 4. TEKS TOMBOL UTAMA */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  TEKS TOMBOL UTAMA
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="Pindahkan Saldo"
                  required
                />
              </div>

              {/* 5. PERINGATAN DANA LAYANAN (GAMBAR 3) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  PERINGATAN DANA LAYANAN (TAHAP 3)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.fee_warning}
                  onChange={(e) => setEditForm((f) => ({ ...f, fee_warning: e.target.value }))}
                  placeholder="Perpindahan Saldo Pinjaman ke Saldo utama membutuhkan Dana Layanan..."
                />
              </div>

              {/* 6. NOMINAL DANA LAYANAN */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  NOMINAL DANA LAYANAN (RP)
                </label>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.fee_amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, fee_amount: e.target.value }))}
                  placeholder="100000"
                  required
                />
              </div>

              {/* Tombol Simpan Perubahan (Ungu) */}
              <button
                type="submit"
                disabled={savingLevel}
                className="mt-4 w-full rounded-2xl bg-primary-700 py-4 text-base font-black text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 disabled:opacity-50"
              >
                {savingLevel ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          ) : editingLevel?.level === 1 ? (
            /* TAMPILAN KHUSUS LEVEL 1 (Hanya field yang aktif di UI Pop-up Level 1) */
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
                <p className="font-bold">Pengaturan Pop-up Level 1 (Fitur Terkunci)</p>
                <p className="text-blue-700/80 mt-0.5">
                  Teks ini muncul saat pengguna level 1 mencoba melakukan transaksi atau transfer.
                </p>
              </div>

              <Input
                label="Judul Pop-up"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Contoh: Fitur Terkunci"
                required
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesan / Penjelasan Pop-up <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.message}
                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Contoh: Maaf, Anda masih berada di Level 1. Silakan Top Up saldo untuk membuka fitur ini."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teks Tombol Utama"
                  value={editForm.button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="Contoh: Top Up Sekarang"
                  required
                />
                <Input
                  label="Teks Tombol Kedua"
                  value={editForm.secondary_button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, secondary_button_text: e.target.value }))}
                  placeholder="Contoh: Kembali"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setEditingLevel(null)}>
                  Batal
                </Button>
                <Button type="submit" loading={savingLevel}>
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          ) : editingLevel?.level === 2 ? (
            /* TAMPILAN KHUSUS LEVEL 2 (Hanya field yang aktif di UI Pop-up Level 2) */
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
                <p className="font-bold">Pengaturan Pop-up Level 2 (Autodebet)</p>
                <p className="text-blue-700/80 mt-0.5">
                  Teks ini muncul saat pengguna level 2 mencoba transfer ke rekening.
                </p>
              </div>

              <Input
                label="Judul Pop-up"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Contoh: Rekening Belum Terintegrasi Autodebet"
                required
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesan / Penjelasan Autodebet <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.message}
                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Contoh: Autodebet adalah sistem pembayaran otomatis yang memungkinkan saldo Anda terpotong langsung..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Peringatan Keamanan (Kotak Info)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Contoh: Fitur ini wajib diaktifkan demi keamanan dan kelancaran transaksi Anda."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teks Tombol Utama"
                  value={editForm.button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="Contoh: Lanjutkan Integrasi"
                  required
                />
                <Input
                  label="Teks Tombol Kedua"
                  value={editForm.secondary_button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, secondary_button_text: e.target.value }))}
                  placeholder="Contoh: Kembali"
                />
              </div>

              <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-teal-800">
                  Tahap 2 Autodebet
                </p>
                <Input
                  label="Judul Tahap 2"
                  value={editForm.detail_title}
                  onChange={(e) => setEditForm((f) => ({ ...f, detail_title: e.target.value }))}
                  placeholder="Rekening Belum Diintegrasikan"
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan Utama Tahap 2
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    value={editForm.detail_content}
                    onChange={(e) => setEditForm((f) => ({ ...f, detail_content: e.target.value }))}
                    placeholder="Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-700 mb-1">
                    Teks Peringatan Merah Tahap 2
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-2xl border border-rose-200 bg-white p-3 text-xs sm:text-sm font-semibold text-red-700 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    value={editForm.l2_detail_warning || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, l2_detail_warning: e.target.value }))}
                    placeholder="Silakan lakukan Top Up Saldo minimal satu kali untuk mengaktifkan fitur transfer dan mengintegrasikan rekening Anda secara otomatis."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setEditingLevel(null)}>
                  Batal
                </Button>
                <Button type="submit" loading={savingLevel}>
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          ) : (
            /* TAMPILAN KHUSUS LEVEL 3 (Hanya field yang aktif di UI Pop-up Level 3) */
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 text-xs text-amber-900">
                <p className="font-bold">Pengaturan Layar Level 3 (Transfer Tertunda &amp; Asuransi)</p>
                <p className="text-amber-700/80 mt-0.5">
                  Teks ini muncul saat pengguna level 3 mencoba transfer (Layar Peringatan Tertunda &amp; Layar Detail Ketentuan).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Judul Utama"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Contoh: Transfer ke Rekening"
                  required
                />
                <Input
                  label="Status Highlight"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Contoh: ANDA TERTUNDA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesan Peringatan Penahanan Transaksi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.message}
                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Pesan yang menjelaskan mengapa transaksi ditahan..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teks Tombol Utama"
                  value={editForm.button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="Contoh: Cek Detail Keterangan"
                  required
                />
                <Input
                  label="Teks Tombol Kedua"
                  value={editForm.secondary_button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, secondary_button_text: e.target.value }))}
                  placeholder="Contoh: Batalkan Transaksi / Kembali"
                />
              </div>

              {/* Bagian Khusus Detail Ketentuan Asuransi */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Pengaturan Layar Detail (Ketentuan Asuransi)
                  </h4>
                </div>

                <Input
                  label="Judul Halaman Detail"
                  value={editForm.detail_title}
                  onChange={(e) => setEditForm((f) => ({ ...f, detail_title: e.target.value }))}
                  placeholder="Contoh: Ketentuan Asuransi Dana"
                />

                <div className="space-y-2 border-t border-amber-100 pt-2">
                  <Input
                    label="Poin 1: Judul Bagian"
                    value={editForm.detail_sec1_header}
                    onChange={(e) => setEditForm((f) => ({ ...f, detail_sec1_header: e.target.value }))}
                    placeholder="Contoh: Mengapa perlu Asuransi?"
                  />
                  <textarea
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    value={editForm.detail_sec1_body}
                    onChange={(e) => setEditForm((f) => ({ ...f, detail_sec1_body: e.target.value }))}
                    placeholder="Penjelasan poin 1..."
                  />
                </div>

                <div className="space-y-2 border-t border-amber-100 pt-2">
                  <Input
                    label="Poin 2: Judul Bagian"
                    value={editForm.detail_sec2_header}
                    onChange={(e) => setEditForm((f) => ({ ...f, detail_sec2_header: e.target.value }))}
                    placeholder="Contoh: Apakah Dana Kembali?"
                  />
                  <textarea
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    value={editForm.detail_sec2_body}
                    onChange={(e) => setEditForm((f) => ({ ...f, detail_sec2_body: e.target.value }))}
                    placeholder="Penjelasan poin 2..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setEditingLevel(null)}>
                  Batal
                </Button>
                <Button type="submit" loading={savingLevel}>
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal Pratinjau Tampilan Pengguna */}
      <LevelLockModal
        state={previewState}
        activeLevel={previewActiveLevel}
        user={{ balance: 10000000, paylater_limit: 1000000000 }}
        levelConfigs={levelConfigs}
        onClose={() => setPreviewState(null)}
        onTopUp={(fee) => {
          setPreviewState(null);
          toast(`Pratinjau: Ini akan membuka form Top Up (Nominal: Rp ${new Intl.NumberFormat("id-ID").format(fee || 100000)}).`, { icon: "ℹ️" });
        }}
        onAction={(type) => {
          setPreviewState(null);
          toast(`Pratinjau aksi: ${type}`, { icon: "ℹ️" });
        }}
      />
    </div>
  );
}
