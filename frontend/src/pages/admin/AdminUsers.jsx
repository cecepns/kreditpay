import { useState } from "react";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import ResourcePage from "@/components/admin/ResourcePage";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { del, get, post, put } from "@/utils/request";
import { formatDate, formatRupiah } from "@/utils/format";

const E = API_ENDPOINTS.ADMIN.USERS;

const columns = [
  { key: "name", label: "Nama", sortable: true },
  { key: "username", label: "Username", sortable: true },
  {
    key: "account_id",
    label: "ID Akun",
    sortable: true,
    render: (r) => (
      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
        {r.account_id || "-"}
      </span>
    ),
  },
  { key: "email", label: "Email" },
  { key: "phone", label: "No HP" },
  {
    key: "level",
    label: "Level",
    render: (r) => {
      const lvl = Number(r.level || 1);
      return (
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-black ${
            lvl === 1
              ? "bg-slate-100 text-slate-700"
              : lvl === 2
              ? "bg-blue-100 text-blue-700"
              : lvl === 3
              ? "bg-amber-100 text-amber-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          Level {lvl}
        </span>
      );
    },
  },
  { key: "role", label: "Role", render: (r) => <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${r.role === "admin" ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-600"}`}>{r.role}</span> },
  { key: "balance", label: "Saldo", sortable: true, render: (r) => formatRupiah(r.balance) },
  { key: "created_at", label: "Dibuat", sortable: true, render: (r) => formatDate(r.created_at) },
];

const initial = {
  name: "",
  username: "",
  account_id: "",
  email: "",
  phone: "",
  password: "",
  role: "user",
  level: "1",
  balance: "0",
  paylater_limit: "0",
};

const form = {
  initial,
  toValues: (u) => ({
    ...initial,
    ...u,
    account_id: u.account_id || "",
    password: "",
    pin: "",
    level: String(u.level ?? 1),
    balance: String(u.balance),
    paylater_limit: String(u.paylater_limit),
  }),
  fields: [
    { name: "name", label: "Nama lengkap" },
    { name: "username", label: "Username" },
    { name: "account_id", label: "Nomor ID Akun", placeholder: "Contoh: MAS KU (otomatis rekening aktif jika kosong)" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "No HP" },
    { name: "password", label: "Password", type: "password", placeholder: "Kosongkan jika tidak diubah" },
    {
      name: "level",
      label: "Level Akun",
      as: "select",
      options: [
        { value: "1", label: "Level 1 - Pop-up Terkunci (Wajib Top Up)" },
        { value: "2", label: "Level 2 - Info Autodebet & Mode Pinjaman" },
        { value: "3", label: "Level 3 - Info Asuransi (Proteksi Transaksi)" },
        { value: "4", label: "Level 4 - Pindah Saldo" },
        { value: "5", label: "Level 5 - Pengembangan 1" },
        { value: "6", label: "Level 6 - Pengembangan 2" },
        { value: "7", label: "Level 7 - Fitur VIP/Prioritas" },
      ],
    },
    { name: "role", label: "Role", as: "select", options: [{ value: "user", label: "User" }, { value: "admin", label: "Admin" }] },
    { name: "balance", label: "Saldo utama", type: "number" },
    { name: "paylater_limit", label: "Limit Pinjaman", type: "number" },
  ],
  validate: (v, isEdit) => {
    const e = {};
    if (v.name.trim().length < 3) e.name = "Nama minimal 3 karakter";
    if (!/^[a-z0-9_.]{4,30}$/.test(v.username)) e.username = "4-30 karakter huruf kecil/angka/._";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Email tidak valid";
    if (!/^(\+62|62|0)8\d{8,12}$/.test(v.phone)) e.phone = "No HP tidak valid";
    const pass = v.password || v.pin;
    if ((!isEdit || pass) && (!pass || pass.length < 6)) e.password = "Password minimal 6 karakter";
    if (Number(v.balance) < 0) e.balance = "Tidak boleh negatif";
    if (Number(v.paylater_limit) < 0) e.paylater_limit = "Tidak boleh negatif";
    return e;
  },
};

const api = {
  create: (v) => post(E.LIST, { ...v, level: Number(v.level || 1), pin: v.password || v.pin }),
  update: (id, v) => put(E.DETAIL(id), { ...v, level: Number(v.level || 1), pin: v.password || v.pin }),
  remove: (id) => del(E.DETAIL(id)),
};

export default function AdminUsers() {
  const [reloadKey, setReloadKey] = useState(0);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [activeBankName, setActiveBankName] = useState("");
  const [loadingBank, setLoadingBank] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleOpenApplyModal = async () => {
    setApplyModalOpen(true);
    setLoadingBank(true);
    try {
      const res = await get(E.DEFAULT_ACCOUNT_ID);
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
      const res = await post(E.APPLY_ALL_ACCOUNT_ID, { account_id: targetId.trim() });
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

  return (
    <>
      <ResourcePage
        key={reloadKey}
        title="Pengguna"
        subtitle="Kelola akun, saldo, limit Pinjaman, dan sinkronisasi ID Akun."
        listUrl={E.LIST}
        columns={columns}
        form={form}
        api={api}
        headerActions={headerActions}
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
