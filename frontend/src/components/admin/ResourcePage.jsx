import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import DataTable from "@/components/admin/DataTable";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { confirmToast } from "@/utils/confirm";

/**
 * Halaman CRUD generik untuk admin panel:
 * search realtime (debounce 300ms), pagination backend, modal create/edit, konfirmasi delete via toast.
 * `form` & `api` dihilangkan untuk halaman read-only.
 */
export default function ResourcePage({ title, subtitle, listUrl, columns, params, form, api, filters, headerActions, extraActions, canCreate = true }) {
  const list = usePaginated(listUrl, { params });
  const showCreate = Boolean(form) && (typeof canCreate === "function" ? canCreate(list) : canCreate !== false);
  const [modal, setModal] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const openModal = (mode, item) => {
    setValues(mode === "edit" ? form.toValues(item) : form.initial);
    setErrors({});
    setModal({ mode, item });
  };
  const closeModal = () => setModal(null);

  const submit = async (e) => {
    e.preventDefault();
    const errs = form.validate(values, modal.mode === "edit");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = modal.mode === "edit" ? await api.update(modal.item.id, values) : await api.create(values);
      toast.success(res.message || "Berhasil disimpan");
      closeModal();
      list.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    const yes = await confirmToast({ title: "Hapus data ini?", message: "Data yang dihapus tidak bisa dikembalikan.", confirmText: "Ya, hapus" });
    if (!yes) return;
    try {
      await toast.promise(api.remove(item.id), { loading: "Menghapus...", success: (r) => r.message || "Terhapus", error: (e) => e.message });
      if (list.rows.length === 1 && list.page > 1) list.setPage(list.page - 1);
      else list.reload();
    } catch { /* ditangani toast.promise */ }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm font-semibold text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {showCreate && <Button icon={Plus} onClick={() => openModal("create")}>Tambah</Button>}
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Cari..." className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-primary-500 focus:outline-none" />
          </div>
          {filters}
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          sort={list.sort}
          onSort={list.toggleSort}
          actions={form && ((row) => (
            <div className="inline-flex items-center gap-1.5">
              {extraActions && extraActions(row, list.reload)}
              <button onClick={() => openModal("edit", row)} aria-label="Edit" className="rounded-xl p-2 text-primary-700 hover:bg-primary-50"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(row)} aria-label="Hapus" className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        />
        <Pagination pagination={list.pagination} onPage={list.setPage} limit={list.limit} onLimit={list.setLimit} />
      </div>

      {form && (
        <Modal open={!!modal} onClose={closeModal} title={`${modal?.mode === "edit" ? "Edit" : "Tambah"} ${title}`}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {form.notice && (
              <div className="rounded-2xl bg-amber-50 p-3.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70">
                {form.notice}
              </div>
            )}
            {form.fields.map((f) => (
              <Input
                key={f.name}
                label={f.label}
                as={f.as}
                type={f.type}
                rows={f.rows}
                placeholder={f.placeholder}
                helper={f.helper}
                value={values[f.name] ?? ""}
                error={errors[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              >
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Input>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeModal}>Batal</Button>
              <Button type="submit" loading={saving}>Simpan</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
