import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Edit3, Eye, Sparkles, UserCheck, ArrowLeftRight } from "lucide-react";
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
  const { data: usersData, reload: reloadUsers } = useFetch(API_ENDPOINTS.ADMIN.USERS.LIST);
  const { data: levelsData, reload: reloadLevels } = useFetch(API_ENDPOINTS.LEVELS.LIST);

  const [selectedUser, setSelectedUser] = useState(null);
  const [targetLevel, setTargetLevel] = useState(1);
  const [updatingUser, setUpdatingUser] = useState(false);

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
    detail_sec1_header: "",
    detail_sec1_body: "",
    detail_sec2_header: "",
    detail_sec2_body: "",
    fee_warning: "",
    fee_amount: 100000,
  });

  const [previewState, setPreviewState] = useState(null);
  const [previewActiveLevel, setPreviewActiveLevel] = useState(4);

  const users = usersData?.data || [];
  const levelConfigs = levelsData?.data || [];
  const configMap = levelConfigs.reduce((acc, cur) => {
    if (cur && cur.level) acc[cur.level] = cur;
    return acc;
  }, {});

  const handleOpenLevelModal = (u) => {
    setSelectedUser(u);
    setTargetLevel(Number(u.level || 1));
  };

  const handleSaveLevel = async () => {
    if (!selectedUser) return;
    setUpdatingUser(true);
    try {
      const res = await put(API_ENDPOINTS.ADMIN.USERS.LEVEL(selectedUser.id), { level: targetLevel });
      toast.success(res.message || `Level user berhasil diubah ke Level ${targetLevel}`);
      setSelectedUser(null);
      reloadUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleOpenEditModal = (item) => {
    const cfg = configMap[item.level] || {};
    let d1Header = "Mengapa perlu Asuransi?";
    let d1Body = "Sesuai dengan kebijakan keamanan transaksi tingkat tinggi (Level 3+), pencairan dana memerlukan Deposit Asuransi Sementara. Ini bertujuan untuk memverifikasi bahwa rekening penerima adalah valid dan aktif.";
    let d2Header = "Apakah Dana Kembali?";
    let d2Body = "YA, 100% KEMBALI. Dana asuransi ini bersifat Refundable. Setelah sistem berhasil memverifikasi transfer masuk, dana asuransi akan otomatis dikembalikan ke saldo akun Anda dalam waktu 10-30 menit bersamaan dengan dana transfer Anda.";

    let feeWarning = "Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\n\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.";
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
          ? 'Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>'
          : item.level === 3
          ? "Transfer ke Rekening"
          : item.level === 2
          ? "Rekening Belum Terintegrasi Autodebet"
          : "Fitur Terkunci"
      ),
      subtitle: cfg.subtitle || (item.level >= 4 ? "PINDAH SALDO" : item.level === 3 ? "ANDA TERTUNDA" : item.subtitle),
      message: cfg.message || (
        item.level >= 4
          ? "Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem."
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
      detail_title: cfg.detail_title || (item.level >= 4 ? "Rincian Perpindahan" : item.level === 3 ? "Ketentuan Asuransi Dana" : "Detail Ketentuan"),
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

      {/* Tabel & Kartu Responsif Pengaturan Level Pengguna */}
      <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">Atur Level Pengguna</h2>
            <p className="text-xs font-semibold text-slate-500">
              Ubah level pengguna untuk mengaktifkan atau membuka kunci fitur secara bertahap.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-black text-primary-700 hover:bg-primary-100 transition whitespace-nowrap"
          >
            Kelola Lengkap &rarr;
          </Link>
        </div>

        {/* 1. Tampilan Mobile (Card List yang Rapi & Bersih) */}
        <div className="space-y-3 sm:hidden">
          {users.map((u) => {
            const lvl = Number(u.level || 1);
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-400 font-semibold">
                      @{u.username} · <span className="uppercase text-[11px] font-black">{u.role}</span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      lvl === 1
                        ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                        : lvl === 2
                        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                        : lvl === 3
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                        : lvl === 4
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-purple-100 text-purple-700 ring-1 ring-purple-200"
                    }`}
                  >
                    Level {lvl}
                  </span>
                </div>

                <div className="rounded-xl bg-white p-2.5 text-xs font-semibold text-slate-600 border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Status Akses Transaksi:
                  </span>
                  {lvl === 1 && "Semua fitur terkunci (Wajib Top Up)"}
                  {lvl === 2 && "Transfer Autodebet & Pulsa Mode Paylater"}
                  {lvl === 3 && "Transfer Tertunda (Verifikasi Asuransi)"}
                  {lvl >= 4 && "Pindah Saldo PayLater (Dana Layanan Top Up)"}
                </div>

                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="soft"
                    icon={UserCheck}
                    onClick={() => handleOpenLevelModal(u)}
                    className="w-full text-xs font-bold justify-center"
                  >
                    Ubah Level
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Tampilan Desktop / Tablet (Tabel Responsif Rapi dengan Lebar Minimum) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-extrabold uppercase text-slate-400">
              <tr>
                <th className="pb-3 pl-3">Nama &amp; Username</th>
                <th className="pb-3 whitespace-nowrap">Level Saat Ini</th>
                <th className="pb-3">Status Akses Transaksi</th>
                <th className="pb-3 text-right pr-3 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {users.map((u) => {
                const lvl = Number(u.level || 1);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 pl-3">
                      <p className="font-extrabold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">@{u.username} · {u.role}</p>
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                          lvl === 1
                            ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                            : lvl === 2
                            ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                            : lvl === 3
                            ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                            : lvl === 4
                            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-purple-100 text-purple-700 ring-1 ring-purple-200"
                        }`}
                      >
                        Level {lvl}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-slate-500 max-w-xs">
                      {lvl === 1 && "Semua fitur terkunci (Wajib Top Up)"}
                      {lvl === 2 && "Transfer Autodebet & Pulsa Mode Paylater"}
                      {lvl === 3 && "Transfer Tertunda (Verifikasi Asuransi)"}
                      {lvl >= 4 && "Pindah Saldo PayLater (Dana Layanan Top Up)"}
                    </td>
                    <td className="py-3.5 text-right pr-3 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="soft"
                        icon={UserCheck}
                        onClick={() => handleOpenLevelModal(u)}
                        className="whitespace-nowrap"
                      >
                        Ubah Level
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                  placeholder='Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>'
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
                  placeholder="Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem."
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
                  placeholder="Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan..."
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
          ) : (
            /* TAMPILAN EDITOR LEVEL 1, 2, 3 */
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500">
                Sesuaikan judul, pesan peringatan, dan teks tombol yang akan tampil pada layar pengguna ketika berada di level ini.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Judul Utama"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Contoh: Transfer ke Rekening / Fitur Terkunci"
                  required
                />
                <Input
                  label="Subjudul / Status Highlight"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Contoh: ANDA TERTUNDA / Info Autodebet"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesan / Penjelasan Utama Pop-up <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.message}
                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Pesan yang menjelaskan status akun atau fitur..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Peringatan Keamanan
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Catatan tambahan di kotak info..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teks Tombol Utama"
                  value={editForm.button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="Contoh: Cek Detail Keterangan / Top Up Sekarang"
                  required
                />
                <Input
                  label="Teks Tombol Kedua"
                  value={editForm.secondary_button_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, secondary_button_text: e.target.value }))}
                  placeholder="Contoh: Batalkan Transaksi / Kembali"
                />
              </div>

              {/* Bagian Khusus Detail Ketentuan Asuransi (Level 3) */}
              {editingLevel?.level === 3 && (
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
              )}

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

      {/* Modal Ubah Level Pengguna */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={`Ubah Level: ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600">
            Pilih level yang akan diterapkan pada akun <b>@{selectedUser?.username}</b>:
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {USER_LEVELS.map((item) => (
              <button
                key={item.level}
                type="button"
                onClick={() => setTargetLevel(item.level)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                  targetLevel === item.level
                    ? "border-primary-600 bg-primary-50/70 ring-1 ring-primary-600"
                    : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div>
                  <p className="font-extrabold text-slate-900">{item.title} — {item.subtitle}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.description}</p>
                </div>
                {targetLevel === item.level && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-600 text-white shrink-0">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>
              Batal
            </Button>
            <Button loading={updatingUser} onClick={handleSaveLevel}>
              Simpan Perubahan
            </Button>
          </div>
        </div>
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
