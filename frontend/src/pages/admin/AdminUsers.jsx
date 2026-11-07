import ResourcePage from "@/components/admin/ResourcePage";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { del, post, put } from "@/utils/request";
import { formatDate, formatRupiah } from "@/utils/format";

const E = API_ENDPOINTS.ADMIN.USERS;

const columns = [
  { key: "name", label: "Nama", sortable: true },
  { key: "username", label: "Username", sortable: true },
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

const initial = { name: "", username: "", email: "", phone: "", password: "", role: "user", level: "1", balance: "0", paylater_limit: "0" };

const form = {
  initial,
  toValues: (u) => ({ ...initial, ...u, password: "", pin: "", level: String(u.level ?? 1), balance: String(u.balance), paylater_limit: String(u.paylater_limit) }),
  fields: [
    { name: "name", label: "Nama lengkap" },
    { name: "username", label: "Username" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "No HP" },
    { name: "password", label: "Password", type: "password", placeholder: "Kosongkan jika tidak diubah" },
    {
      name: "level",
      label: "Level Akun",
      as: "select",
      options: [
        { value: "1", label: "Level 1 - Pop-up Terkunci (Wajib Top Up)" },
        { value: "2", label: "Level 2 - Info Autodebet & Mode Paylater" },
        { value: "3", label: "Level 3 - Info Asuransi (Proteksi Transaksi)" },
        { value: "4", label: "Level 4 - Pindah Saldo" },
        { value: "5", label: "Level 5 - Pengembangan 1" },
        { value: "6", label: "Level 6 - Pengembangan 2" },
        { value: "7", label: "Level 7 - Fitur VIP/Prioritas" },
      ],
    },
    { name: "role", label: "Role", as: "select", options: [{ value: "user", label: "User" }, { value: "admin", label: "Admin" }] },
    { name: "balance", label: "Saldo utama", type: "number" },
    { name: "paylater_limit", label: "Limit PayLater", type: "number" },
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
  return <ResourcePage title="Pengguna" subtitle="Kelola akun, saldo, dan limit PayLater." listUrl={E.LIST} columns={columns} form={form} api={api} />;
}
