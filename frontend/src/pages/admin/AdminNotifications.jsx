import ResourcePage from "@/components/admin/ResourcePage";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { del, post, put } from "@/utils/request";
import { formatDateTime } from "@/utils/format";

const E = API_ENDPOINTS.ADMIN.NOTIFICATIONS;

const columns = [
  { key: "title", label: "Judul", sortable: true },
  { key: "body", label: "Isi pesan", render: (r) => <span className="line-clamp-2 max-w-md">{r.body}</span> },
  { key: "created_at", label: "Dikirim", sortable: true, render: (r) => formatDateTime(r.created_at) },
];

const form = {
  initial: { title: "", body: "" },
  toValues: (n) => ({ title: n.title, body: n.body }),
  fields: [
    { name: "title", label: "Judul" },
    { name: "body", label: "Isi pesan", as: "textarea", rows: 5 },
  ],
  validate: (v) => {
    const e = {};
    if (v.title.trim().length < 3) e.title = "Judul minimal 3 karakter";
    if (v.body.trim().length < 3) e.body = "Isi pesan minimal 3 karakter";
    return e;
  },
};

const api = { create: (v) => post(E.LIST, v), update: (id, v) => put(E.DETAIL(id), v), remove: (id) => del(E.DETAIL(id)) };

export default function AdminNotifications() {
  return <ResourcePage title="Notifikasi" subtitle="Pesan yang dikirim ke semua pengguna." listUrl={E.LIST} columns={columns} form={form} api={api} />;
}
