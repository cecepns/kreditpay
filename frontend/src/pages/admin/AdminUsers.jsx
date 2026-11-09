import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, ShieldBan, Smartphone, UserCheck } from "lucide-react";
import ResourcePage from "@/components/admin/ResourcePage";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { del, post, put } from "@/utils/request";
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
  {
    key: "is_blocked",
    label: "Status Akun",
    sortable: true,
    render: (r) => {
      if (r.role === "admin") {
        return <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">AKTIF</span>;
      }
      const blocked = !!r.is_blocked;
      const deviceBlocked = !!r.is_device_blocked;
      return (
        <div className="flex flex-col items-start gap-1">
          {blocked ? (
            <span className="rounded-lg bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-700">DIBLOKIR</span>
          ) : (
            <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">AKTIF</span>
          )}
          {deviceBlocked && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
              <ShieldBan className="h-3 w-3" /> IMEI Blokir
            </span>
          )}
        </div>
      );
    },
  },
  {
    key: "device_id",
    label: "IMEI / Perangkat",
    render: (r) =>
      r.device_id ? (
        <span
          title={r.device_id}
          className="inline-block max-w-[140px] truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700"
        >
          {r.device_id}
        </span>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      ),
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

  const reloadFnRef = useRef(null);
  const [statusUser, setStatusUser] = useState(null);
  const [statusForm, setStatusForm] = useState({
    is_blocked: false,
    block_device: false,
    device_id: "",
    reason: "",
  });
  const [savingStatus, setSavingStatus] = useState(false);

  const handleOpenStatusModal = (row, reload) => {
    reloadFnRef.current = reload;
    setStatusUser(row);
    setStatusForm({
      is_blocked: !!row.is_blocked,
      block_device: !!row.is_device_blocked,
      device_id: row.device_id || "",
      reason: row.blocked_reason || "",
    });
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusUser) return;
    if (statusForm.block_device && !statusForm.device_id.trim() && !statusUser.device_fingerprint) {
      return toast.error("Masukkan IMEI / ID Perangkat pengguna untuk memblokir HP ini.");
    }
    setSavingStatus(true);
    try {
      const res = await put(E.STATUS(statusUser.id), {
        is_blocked: statusForm.is_blocked,
        block_device: statusForm.block_device,
        device_id: statusForm.device_id.trim() || null,
        reason: statusForm.reason.trim() || null,
      });
      toast.success(res.message || "Status akun berhasil diperbarui");
      setStatusUser(null);
      if (reloadFnRef.current) reloadFnRef.current();
      else setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui status akun");
    } finally {
      setSavingStatus(false);
    }
  };

  const extraActions = (row, reload) => {
    if (row.role === "admin") return null;
    const isBlocked = !!row.is_blocked || !!row.is_device_blocked;
    return (
      <button
        type="button"
        onClick={() => handleOpenStatusModal(row, reload)}
        title="Status Akun & Blokir IMEI"
        aria-label="Status Akun & Blokir IMEI"
        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
          isBlocked
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
        }`}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>Status Akun</span>
      </button>
    );
  };

  return (
    <>
      <ResourcePage
        key={reloadKey}
        title="Pengguna"
        subtitle="Kelola akun, saldo, limit Pinjaman, serta status blokir akun & IMEI."
        listUrl={E.LIST}
        columns={columns}
        form={form}
        api={api}
        extraActions={extraActions}
      />

      <Modal
        open={!!statusUser}
        onClose={() => !savingStatus && setStatusUser(null)}
        title="Status Akun &amp; Blokir IMEI"
      >
        {statusUser && (
          <form onSubmit={handleSaveStatus} className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{statusUser.name}</p>
                <p className="text-xs font-semibold text-slate-500 truncate">
                  @{statusUser.username} • {statusUser.phone}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-black ${
                  statusUser.is_blocked
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {statusUser.is_blocked ? "DIBLOKIR" : "AKTIF"}
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Status Akun
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setStatusForm((f) => ({
                      ...f,
                      is_blocked: false,
                      block_device: false,
                    }))
                  }
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-xs font-black transition ${
                    !statusForm.is_blocked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Aktifkan Akun
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStatusForm((f) => ({
                      ...f,
                      is_blocked: true,
                      block_device: true,
                    }))
                  }
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-xs font-black transition ${
                    statusForm.is_blocked
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <ShieldBan className="h-4 w-4" />
                  Blokir Akun
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusForm.block_device}
                  onChange={(e) =>
                    setStatusForm((f) => ({ ...f, block_device: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <div className="text-xs leading-relaxed">
                  <p className="font-black text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-amber-700" />
                    Blokir IMEI / Perangkat HP (Cegah Daftar Ulang)
                  </p>
                  <p className="text-slate-600 font-medium mt-0.5">
                    Jika diaktifkan, HP ini tidak dapat dipakai untuk mendaftar akun baru atau masuk menggunakan akun lain.
                  </p>
                </div>
              </label>

              <div>
                <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  IMEI / ID Perangkat
                </label>
                <input
                  type="text"
                  value={statusForm.device_id}
                  onChange={(e) =>
                    setStatusForm((f) => ({ ...f, device_id: e.target.value }))
                  }
                  placeholder="Otomatis terisi saat user login / isi manual IMEI"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                />
                {statusUser.device_fingerprint && (
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    Sidik Perangkat (Fingerprint):{" "}
                    <code className="rounded bg-white px-1.5 py-0.5 text-slate-700">
                      {statusUser.device_fingerprint}
                    </code>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Alasan Pemblokiran (Opsional)
              </label>
              <input
                type="text"
                value={statusForm.reason}
                onChange={(e) =>
                  setStatusForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="Contoh: Pelanggaran ketentuan / akun duplikat"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStatusUser(null)}
                disabled={savingStatus}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant={statusForm.is_blocked || statusForm.block_device ? "danger" : "primary"}
                loading={savingStatus}
              >
                Simpan Status
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
