import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Trash2, Tag, Eye, ArrowUpDown, CheckCircle2, XCircle } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { EmptyState, ListSkeleton, ErrorState } from "@/components/ui/StateViews";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { post, put, del } from "@/utils/request";
import { confirmToast } from "@/utils/confirm";

const E = API_ENDPOINTS.ADMIN.PROMOS;

const COLOR_PRESETS = [
  { label: "Hijau Toska", style: "from-emerald-500 to-accent-500", preview: "bg-gradient-to-br from-emerald-500 to-teal-500" },
  { label: "Biru Indigo", style: "from-indigo-500 to-primary-600", preview: "bg-gradient-to-br from-indigo-500 to-purple-600" },
  { label: "Merah Oranye", style: "from-rose-500 to-orange-400", preview: "bg-gradient-to-br from-rose-500 to-orange-400" },
  { label: "Kuning Emas", style: "from-amber-500 to-yellow-400", preview: "bg-gradient-to-br from-amber-500 to-yellow-400" },
  { label: "Ungu Magenta", style: "from-purple-600 to-pink-500", preview: "bg-gradient-to-br from-purple-600 to-pink-500" },
  { label: "Cyan Biru", style: "from-cyan-500 to-blue-600", preview: "bg-gradient-to-br from-cyan-500 to-blue-600" },
  { label: "Midnight", style: "from-slate-700 to-slate-900", preview: "bg-gradient-to-br from-slate-700 to-slate-900" },
];

const INITIAL_FORM = {
  tag: "FOOD",
  title: "",
  description: "",
  style: "from-emerald-500 to-accent-500",
  link_url: "",
  is_active: 1,
  sort_order: 0,
};

export default function AdminPromos() {
  const list = usePaginated(E.LIST, { defaultSort: "sort_order", defaultOrder: "ASC" });
  const [modal, setModal] = useState(null); // null | { mode: "create" | "edit", item?: object }
  const [values, setValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setValues(INITIAL_FORM);
    setErrors({});
    setModal({ mode: "create" });
  };

  const openEdit = (item) => {
    setValues({
      tag: item.tag || "",
      title: item.title || "",
      description: item.description || "",
      style: item.style || "from-emerald-500 to-accent-500",
      link_url: item.link_url || "",
      is_active: item.is_active ? 1 : 0,
      sort_order: item.sort_order || 0,
    });
    setErrors({});
    setModal({ mode: "edit", item });
  };

  const closeModal = () => setModal(null);

  const validate = () => {
    const errs = {};
    if (!values.tag.trim()) errs.tag = "Tag promo wajib diisi";
    if (!values.title.trim()) errs.title = "Judul promo wajib diisi";
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        ...values,
        tag: values.tag.trim().toUpperCase(),
        title: values.title.trim(),
        description: values.description.trim(),
        sort_order: parseInt(values.sort_order) || 0,
        is_active: Number(values.is_active),
      };

      if (modal.mode === "edit") {
        const res = await put(E.DETAIL(modal.item.id), payload);
        toast.success(res.message || "Promo berhasil diperbarui");
      } else {
        const res = await post(E.CREATE, payload);
        toast.success(res.message || "Promo berhasil ditambahkan");
      }
      closeModal();
      list.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      const newStatus = item.is_active ? 0 : 1;
      await put(E.DETAIL(item.id), {
        ...item,
        is_active: newStatus,
      });
      toast.success(newStatus ? "Promo diaktifkan" : "Promo dinonaktifkan");
      list.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (item) => {
    const yes = await confirmToast({
      title: "Hapus Promo?",
      message: `Promo "${item.title}" akan dihapus permanen dan tidak akan tampil di Beranda pengguna.`,
      confirmText: "Ya, Hapus",
    });
    if (!yes) return;

    try {
      await toast.promise(del(E.DETAIL(item.id)), {
        loading: "Menghapus promo...",
        success: (res) => res.message || "Promo berhasil dihapus",
        error: (err) => err.message,
      });
      list.reload();
    } catch {
      // Ditangani toast.promise
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Manajemen Info &amp; Promo</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Kelola banner kartu promosi yang tampil pada bagian &quot;Info &amp; Promo&quot; di halaman Beranda.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Tambah Promo
        </Button>
      </div>

      {/* Main Container */}
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Cari promo berdasarkan tag / judul..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Total: {list.pagination.total} Promo</span>
          </div>
        </div>

        {/* List Content */}
        {list.loading ? (
          <div className="p-6">
            <ListSkeleton count={4} />
          </div>
        ) : list.error ? (
          <div className="p-6">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="Belum Ada Promo"
              message="Belum ada banner promo yang ditambahkan. Klik tombol 'Tambah Promo' di atas untuk membuat promo baru."
            />
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 pl-6 pr-3">Preview Banner</th>
                    <th className="px-4 py-4">Tag &amp; Judul</th>
                    <th className="px-4 py-4">Deskripsi / Link</th>
                    <th className="px-4 py-4 text-center">Urutan</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="py-4 pl-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {list.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 pl-6 pr-3">
                        <div className={`relative h-20 w-44 rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-sm flex flex-col justify-between ${row.style}`}>
                          <span className="self-start rounded-md bg-white/25 px-2 py-0.5 text-[10px] font-black tracking-wide">
                            {row.tag}
                          </span>
                          <h4 className="line-clamp-2 text-xs font-extrabold leading-tight">
                            {row.title}
                          </h4>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="space-y-1">
                          <span className="inline-block rounded-lg bg-primary-50 px-2.5 py-0.5 text-xs font-black text-primary-700">
                            {row.tag}
                          </span>
                          <p className="font-extrabold text-slate-800 line-clamp-1">{row.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle text-slate-500">
                        <p className="line-clamp-2 text-xs leading-relaxed max-w-xs">{row.description || "-"}</p>
                        {row.link_url && (
                          <span className="text-[11px] font-bold text-accent-600 block mt-1 line-clamp-1">
                            Link: {row.link_url}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle text-center font-bold text-slate-700">
                        #{row.sort_order}
                      </td>
                      <td className="px-4 py-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(row)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition ${
                            row.is_active
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {row.is_active ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-slate-400" /> Nonaktif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 pl-4 pr-6 align-middle text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            aria-label="Edit Promo"
                            className="rounded-xl p-2 text-primary-700 hover:bg-primary-50 transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(row)}
                            aria-label="Hapus Promo"
                            className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {list.rows.map((row) => (
                <div key={row.id} className="pt-3 first:pt-0 space-y-3">
                  <div className={`relative h-24 w-full rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm flex flex-col justify-between ${row.style}`}>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-white/25 px-2.5 py-0.5 text-xs font-black tracking-wide">
                        {row.tag}
                      </span>
                      <span className="text-[11px] font-bold text-white/80">#{row.sort_order}</span>
                    </div>
                    <h4 className="text-sm font-extrabold leading-snug line-clamp-2">
                      {row.title}
                    </h4>
                  </div>
                  {row.description && (
                    <p className="text-xs font-semibold text-slate-500 line-clamp-2">{row.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary-50 px-3 py-1.5 text-xs font-extrabold text-primary-700"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          pagination={list.pagination}
          onPage={list.setPage}
          limit={list.limit}
          onLimit={list.setLimit}
        />
      </div>

      {/* Modal Create & Edit Promo */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.mode === "edit" ? "Edit Info & Promo" : "Tambah Info & Promo Baru"}
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          {/* Live Card Preview */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
              Live Preview Banner
            </label>
            <div className={`relative h-32 w-full rounded-3xl bg-gradient-to-br p-5 text-white shadow-md transition-all flex flex-col justify-between ${values.style}`}>
              <span className="self-start rounded-lg bg-white/25 px-3 py-1 text-xs font-black tracking-wide">
                {values.tag || "TAG"}
              </span>
              <h3 className="text-lg font-extrabold leading-snug line-clamp-2">
                {values.title || "Judul Promosi Anda..."}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tag Promo"
              name="tag"
              value={values.tag}
              onChange={(e) => setValues({ ...values, tag: e.target.value })}
              placeholder="Contoh: FOOD, PAYLATER"
              error={errors.tag}
              required
            />
            <Input
              label="Urutan Tampil"
              name="sort_order"
              type="number"
              value={values.sort_order}
              onChange={(e) => setValues({ ...values, sort_order: e.target.value })}
              placeholder="0"
            />
          </div>

          <Input
            label="Judul Promo"
            name="title"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
            placeholder="Contoh: Diskon Rp 20rb Merchant Pilihan"
            error={errors.title}
            required
          />

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
              Pilihan Gradien Warna
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.style}
                  type="button"
                  onClick={() => setValues({ ...values, style: preset.style })}
                  className={`flex items-center gap-2 rounded-2xl border p-2 text-left transition ${
                    values.style === preset.style
                      ? "border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className={`h-6 w-6 shrink-0 rounded-xl ${preset.preview}`} />
                  <span className="text-xs font-bold text-slate-700 truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
              Deskripsi Promo (Opsional)
            </label>
            <textarea
              rows={2}
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              placeholder="Tuliskan keterangan detail tentang promo ini..."
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:outline-none"
            />
          </div>

          <Input
            label="Tautan URL / Aksi (Opsional)"
            name="link_url"
            value={values.link_url}
            onChange={(e) => setValues({ ...values, link_url: e.target.value })}
            placeholder="Contoh: /app/paylater atau https://..."
          />

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
              Status Tampil
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="is_active"
                  checked={values.is_active === 1}
                  onChange={() => setValues({ ...values, is_active: 1 })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                Aktif (Tampil di Beranda)
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="is_active"
                  checked={values.is_active === 0}
                  onChange={() => setValues({ ...values, is_active: 0 })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                Nonaktif (Disembunyikan)
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              {modal?.mode === "edit" ? "Simpan Perubahan" : "Tambahkan Promo"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
