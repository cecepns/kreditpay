import ResourcePage from "@/components/admin/ResourcePage";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { del, post, put } from "@/utils/request";
import { formatDateTime } from "@/utils/format";

const E = API_ENDPOINTS.ADMIN.BANKS;

const columns = [
  { key: "bank_name", label: "Nama Bank", sortable: true },
  { key: "account_number", label: "Nomor Rekening" },
  { key: "account_name", label: "Atas Nama", sortable: true },
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
    { name: "account_name", label: "Atas Nama", placeholder: "Contoh: MAS KU" },
    {
      name: "is_active",
      label: "Status Rekening",
      as: "select",
      options: [
        { value: "1", label: "Aktif (Dapat dipilih user)" },
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
  return (
    <ResourcePage
      title="Rekening Bank"
      subtitle="Kelola rekening bank tujuan transfer untuk konfirmasi top up saldo pengguna."
      listUrl={E.LIST}
      columns={columns}
      form={form}
      api={api}
    />
  );
}

