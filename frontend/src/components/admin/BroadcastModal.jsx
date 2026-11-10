import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BellRing, Globe, Radio, Send, UserCheck, Users } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import UserRecipientPicker from "@/components/admin/UserRecipientPicker";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { post, put } from "@/utils/request";

const CHANNELS = [
  {
    value: "both",
    label: "Web + Push Notif",
    desc: "Tampil di aplikasi & kirim popup Push",
    icon: Radio,
  },
  {
    value: "web",
    label: "Notifikasi Web Saja",
    desc: "Hanya masuk kotak Notifikasi aplikasi",
    icon: Globe,
  },
  {
    value: "push",
    label: "Push Notif Saja",
    desc: "Popup Push langsung ke HP/Desktop",
    icon: BellRing,
  },
];

const TARGET_TYPES = [
  { value: "all", label: "Semua User", icon: Users },
  { value: "single", label: "User Tertentu (1)", icon: UserCheck },
  { value: "multiple", label: "Beberapa User", icon: Users },
];

const URL_PRESETS = [
  { label: "Halaman Notifikasi", url: "/app/notifikasi" },
  { label: "Beranda App", url: "/app" },
  { label: "Pengajuan Pinjaman", url: "/app/paylater" },
  { label: "Riwayat Transaksi", url: "/app/riwayat" },
];

const INITIAL_FORM = {
  title: "",
  body: "",
  channel: "both",
  target_type: "all",
  user_ids: [],
  click_url: "/app/notifikasi",
};

export default function BroadcastModal({ open, mode = "create", initialItem = null, onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (mode === "edit" && initialItem) {
      setForm({
        title: initialItem.title || "",
        body: initialItem.body || "",
        channel: initialItem.channel || "web",
        target_type: initialItem.target_type || "all",
        user_ids: [],
        click_url: initialItem.click_url || "/app/notifikasi",
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [open, mode, initialItem]);

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = "Judul broadcast minimal 3 karakter";
    if (form.body.trim().length < 3) e.body = "Isi pesan minimal 3 karakter";
    if (mode === "create") {
      if (form.target_type === "single" && form.user_ids.length !== 1) {
        e.user_ids = "Pilih tepat 1 user tujuan";
      } else if (form.target_type === "multiple" && form.user_ids.length < 1) {
        e.user_ids = "Pilih minimal 1 user tujuan";
      }
    }
    return e;
  };

  const handleTargetChange = (nextType) => {
    setForm((prev) => ({
      ...prev,
      target_type: nextType,
      user_ids:
        nextType === "all"
          ? []
          : nextType === "single"
          ? prev.user_ids.slice(0, 1)
          : prev.user_ids,
    }));
    setErrors((prev) => ({ ...prev, user_ids: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      let res;
      if (mode === "edit" && initialItem) {
        res = await put(API_ENDPOINTS.ADMIN.NOTIFICATIONS.DETAIL(initialItem.id), {
          title: form.title.trim(),
          body: form.body.trim(),
          click_url: form.click_url.trim() || "/app/notifikasi",
        });
      } else {
        res = await post(API_ENDPOINTS.ADMIN.NOTIFICATIONS.LIST, {
          title: form.title.trim(),
          body: form.body.trim(),
          channel: form.channel,
          target_type: form.target_type,
          user_ids: form.user_ids,
          click_url: form.click_url.trim() || "/app/notifikasi",
        });
      }
      toast.success(res.message || "Broadcast berhasil disimpan");
      onSaved?.(res.data);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Gagal memproses broadcast");
    } finally {
      setSaving(false);
    }
  };

  const usesPush = form.channel === "both" || form.channel === "push";

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      title={mode === "edit" ? "Edit Notifikasi / Broadcast" : "Buat Broadcast Baru"}
      size="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {mode === "create" ? (
          <>
            {/* Pilih Mode Pengiriman */}
            <div className="space-y-2">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Jenis Pengiriman
              </span>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  const active = form.channel === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, channel: c.value }))}
                      className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                        active
                          ? "border-primary-600 bg-primary-50/80 ring-2 ring-primary-500/20"
                          : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/70"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-xl ${
                          active ? "bg-primary-700 text-white" : "bg-white text-slate-600 shadow-xs"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={`mt-2.5 text-xs font-extrabold ${active ? "text-primary-900" : "text-slate-800"}`}>
                        {c.label}
                      </span>
                      <span className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">
                        {c.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilih Target Penerima */}
            <div className="space-y-2">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Target Penerima
              </span>
              <div className="grid grid-cols-3 gap-2">
                {TARGET_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = form.target_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTargetChange(t.value)}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition ${
                        active
                          ? "border-primary-600 bg-primary-700 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {form.target_type !== "all" && (
              <UserRecipientPicker
                mode={form.target_type === "single" ? "single" : "multiple"}
                selectedIds={form.user_ids}
                onChange={(ids) => {
                  setForm((f) => ({ ...f, user_ids: ids }));
                  setErrors((err) => ({ ...err, user_ids: undefined }));
                }}
                error={errors.user_ids}
              />
            )}
          </>
        ) : (
          initialItem && (
            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
              <p>
                Mode:{" "}
                <strong className="text-slate-800">
                  {initialItem.channel === "both"
                    ? "Web + Push Notif"
                    : initialItem.channel === "push"
                    ? "Push Notif Saja"
                    : "Notifikasi Web Saja"}
                </strong>
                {" · "}
                Target:{" "}
                <strong className="text-slate-800">
                  {initialItem.target_type === "all"
                    ? "Semua User"
                    : initialItem.target_type === "single"
                    ? initialItem.target_user_name || `User #${initialItem.user_id}`
                    : initialItem.target_users_label || `${initialItem.target_count || 0} User`}
                </strong>
              </p>
            </div>
          )
        )}

        <Input
          label="Judul Broadcast"
          value={form.title}
          error={errors.title}
          placeholder="Contoh: Promo Spesial Bunga 0% Bulan Ini!"
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />

        <Input
          label="Isi Pesan"
          as="textarea"
          rows={4}
          value={form.body}
          error={errors.body}
          placeholder="Tulis pengumuman atau detail promo yang akan diterima pengguna..."
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />

        {(usesPush || mode === "edit") && (
          <div className="space-y-2">
            <Input
              label="Halaman Tujuan Saat Push Diklik"
              value={form.click_url}
              placeholder="/app/notifikasi"
              helper="Path halaman web yang terbuka otomatis saat user mengetuk notifikasi push."
              onChange={(e) => setForm((f) => ({ ...f, click_url: e.target.value }))}
            />
            <div className="flex flex-wrap gap-1.5">
              {URL_PRESETS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, click_url: p.url }))}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    form.click_url === p.url
                      ? "bg-primary-100 text-primary-800 ring-1 ring-primary-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" icon={Send} loading={saving}>
            {mode === "edit"
              ? "Simpan Perubahan"
              : form.channel === "web"
              ? "Kirim Notifikasi Web"
              : "Kirim Broadcast Sekarang"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

