import { useState } from "react";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import ResourcePage from "@/components/admin/ResourcePage";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { del, get, post, put } from "@/utils/request";
import { formatDateTime } from "@/utils/format";
import { confirmToast } from "@/utils/confirm";

const E = API_ENDPOINTS.ADMIN.BANKS;
const USER_E = API_ENDPOINTS.ADMIN.USERS;

const columns = [
  { key: "bank_name", label: "Nama Bank", sortable: true },
  { key: "account_number", label: "Nomor Rekening" },
  {
    key: "account_name",
    label: "Atas Nama (ID Akun User)",
    sortable: true,
    render: (r) => (
      <span className="font-bold text-slate-800">
        {r.account_name}
      </span>
    ),
  },
  {
    key: "is_active",
    label: "Status",
    render: (r) => (
      <span
        className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
          r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {r.is_active ? "Aktif" : "Nonaktif"}
      </span>
    ),
  },
  { key: "created_at", label: "Dibuat", sortable: true, render: (r) => formatDateTime(r.created_at) },
];

const form = {
  initial: { bank_name: "", account_number: "", account_name: "", is_active: "1" },
  toValues: (b) => ({
    bank_name: b.bank_name,
    account_number: b.account_number,
    account_name: b.account_name,
    is_active: String(b.is_active ?? 1),
  }),
  fields: [
    { name: "bank_name", label: "Nama Bank", placeholder: "Contoh: BCA, Mandiri, BRI" },
    { name: "account_number", label: "Nomor Rekening", placeholder: "Contoh: 123456789" },
    {
      name: "account_name",
      label: "Atas Nama Rekening",
      placeholder: "Contoh: MAS KU",
      helper: "Ketika Anda klik 'Simpan', Nomor ID Akun seluruh user otomatis langsung berubah mengikuti Atas Nama ini.",
    },
    {
      name: "is_active",
      label: "Status Rekening",
      as: "select",
      options: [
        { value: "1", label: "Aktif (Dapat dipilih user & Sinkron ke ID Akun)" },
        { value: "0", label: "Nonaktif (Disembunyikan)" },
      ],
    },
  ],
  validate: (v) => {
    const e = {};
    if (v.bank_name.trim().length < 2) e.bank_name = "Nama bank minimal 2 karakter";
    if (v.account_number.trim().length < 4) e.account_number = "Nomor rekening minimal 4 digit";
    if (v.account_name.trim().length < 3) e.account_name = "Atas nama minimal 3 karakter";
    return e;
  },
};

const api = {
  create: (v) => post(E.LIST, { ...v, is_active: Number(v.is_active) }),
  update: (id, v) => put(E.DETAIL(id), { ...v, is_active: Number(v.is_active) }),
  remove: (id) => del(E.DETAIL(id)),
};

export default function AdminBanks() {
  const [reloadKey, setReloadKey] = useState(0);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [activeBankName, setActiveBankName] = useState("");
  const [loadingBank, setLoadingBank] = useState(false);
  const [applying, setApplying] = useState(false);

  // Aksi 1-klik dari baris tabel: terapkan nama rekening ini ke semua user langsung
  const handleApplySingleBank = async (row) => {
    const ok = await confirmToast({
      title: "Jadikan ID Seluruh User?",
      message: `Nomor ID Akun seluruh pengguna akan diubah menjadi "${row.account_name}".`,
      confirmText: "Ya, Terapkan",
    });
    if (!ok) return;

    try {
      const res = await post(USER_E.APPLY_ALL_ACCOUNT_ID, { account_id: row.account_name });
      toast.success(res.message || `ID seluruh user berhasil diubah menjadi "${row.account_name}"`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui ID Akun");
    }
  };

  const handleOpenApplyModal = async () => {
    setApplyModalOpen(true);
    setLoadingBank(true);
    try {
      const res = await get(USER_E.DEFAULT_ACCOUNT_ID);
      const name = res.data?.account_name || "";
      setActiveBankName(name);
      setTargetId(name);
    } catch {
      toast.error("Gagal mengambil nama rekening aktif");
    } finally {
      setLoadingBank(false);
    }
  };

  const handleApplyAll = async (e) => {
    e.preventDefault();
    if (!targetId.trim()) {
      toast.error("Nomor ID Akun tidak boleh kosong");
      return;
    }
    setApplying(true);
    try {
      const res = await post(USER_E.APPLY_ALL_ACCOUNT_ID, { account_id: targetId.trim() });
      toast.success(res.message || "Berhasil memperbarui ID Akun semua pengguna");
      setApplyModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui ID Akun");
    } finally {
      setApplying(false);
    }
  };

  const headerActions = (
    <Button
      type="button"
      variant="soft"
      icon={Users}
      onClick={handleOpenApplyModal}
      className="!bg-purple-100 !text-purple-800 hover:!bg-purple-200"
    >
      Ubah Semua ID User
    </Button>
  );

  const extraActions = (row) => (
    <button
      type="button"
      onClick={() => handleApplySingleBank(row)}
      title="Terapkan Nama Rekening ini ke Semua ID User"
      className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition ring-1 ring-purple-200/50"
    >
      <Users className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Set ke Semua User</span>
    </button>
  );

  return (
    <>
      <ResourcePage
        key={reloadKey}
        title="Rekening Bank"
        subtitle="Kelola rekening bank tujuan transfer. Mengubah nama rekening atau klik Simpan otomatis mengubah ID seluruh user."
        listUrl={E.LIST}
        columns={columns}
        form={form}
        api={api}
        headerActions={headerActions}
        extraActions={extraActions}
      />

      <Modal
        open={applyModalOpen}
        onClose={() => !applying && setApplyModalOpen(false)}
        title="Ubah Semua ID Akun Pengguna"
      >
        <form onSubmit={handleApplyAll} className="space-y-4">
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-medium text-amber-800 ring-1 ring-amber-200/70">
            <p className="mb-1 font-bold text-amber-900">Perhatian (Apply to All)</p>
            Tindakan ini akan mengubah Nomor ID Akun (<code>account_id</code>) untuk <strong>seluruh pengguna</strong> sekaligus.
            Nomor ID Akun ini ditampilkan pada menu Akun pengguna dan baris Atas Nama saat konfirmasi Top Up transfer.
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              ID Akun Baru (Atas Nama Rekening)
            </label>
            <input
              type="text"
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Contoh: MAS KU"
              disabled={loadingBank || applying}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none"
            />
            {activeBankName && (
              <p className="mt-2 text-xs text-slate-500">
                Nama rekening aktif saat ini:{" "}
                <button
                  type="button"
                  onClick={() => setTargetId(activeBankName)}
                  className="font-bold text-primary-600 underline hover:text-primary-700"
                >
                  {activeBankName}
                </button>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setApplyModalOpen(false)}
              disabled={applying}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={applying || loadingBank || !targetId.trim()}
            >
              {applying ? "Menyimpan..." : "Terapkan ke Semua User"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
