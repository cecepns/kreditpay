import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Camera, Eye, EyeOff, Hash, LayoutDashboard, LogOut, Mail, Pencil, Phone, User, MessageSquare } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useFetch from "@/hooks/useFetch";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put, upload } from "@/utils/request";
import { confirmToast } from "@/utils/confirm";
import { digitsOnly, fileUrl, formatDate } from "@/utils/format";

const validateProfile = (v) => {
  const e = {};
  if (v.name.trim().length < 3) e.name = "Nama minimal 3 karakter";
  if (!/^[a-z0-9_.]{4,30}$/.test(v.username.trim().toLowerCase())) {
    e.username = "4-30 karakter: huruf kecil, angka, titik, underscore";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Format email tidak valid";
  if (!/^(\+62|62|0)8\d{8,12}$/.test(v.phone.trim())) e.phone = "No HP tidak valid";
  if (v.password && v.password.length < 6) e.password = "Password minimal 6 karakter";
  return e;
};

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const { data: settingsData } = useFetch(API_ENDPOINTS.SETTINGS.PUBLIC);
  const input = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", username: "", email: "", phone: "", password: "" });
  const [editErrors, setEditErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEditModal = () => {
    setEditForm({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
    });
    setEditErrors({});
    setShowPass(false);
    setEditOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = validateProfile(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        username: editForm.username.trim().toLowerCase(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      const res = await put(API_ENDPOINTS.AUTH.PROFILE, payload);
      setUser(res.data);
      toast.success(res.message || "Profil berhasil diperbarui");
      setEditOpen(false);
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  const waUrl = settingsData?.data?.whatsapp_url || "https://wa.me/6281200000000";

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Ukuran foto maksimal 2MB");
    const fd = new FormData();
    fd.append("avatar", file);
    setUploading(true);
    try {
      const res = await upload(API_ENDPOINTS.AUTH.AVATAR, fd);
      setUser(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onLogout = async () => {
    if (await confirmToast({ title: "Keluar dari akun?", confirmText: "Ya, keluar" })) logout();
  };

  const rows = [
    { icon: Hash, label: "Nomor ID Akun", value: user.account_id || (user.id ? `USR${String(user.id).padStart(6, "0")}` : "-") },
    { icon: User, label: "Username", value: `@${user.username}` },
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "No HP", value: user.phone },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
        <div className="relative mx-auto h-24 w-24">
          {user.avatar ? <img src={fileUrl(user.avatar)} alt="Foto profil" className="h-24 w-24 rounded-full object-cover" /> : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-primary-100 text-3xl font-extrabold text-primary-700">{user.name[0].toUpperCase()}</span>
          )}
          <button onClick={() => input.current.click()} disabled={uploading} aria-label="Ganti foto" className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-accent-500 text-white shadow disabled:opacity-60"><Camera className="h-4 w-4" /></button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-slate-800">{user.name}</h2>
        <p className="text-sm font-semibold text-slate-400">Bergabung sejak {formatDate(user.created_at)}</p>
        <button
          type="button"
          onClick={openEditModal}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-50 px-4 py-2 text-xs font-extrabold text-primary-700 ring-1 ring-primary-200/70 transition hover:bg-primary-100 active:scale-[.98]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Ubah Profil
        </button>
      </section>

      <section className="divide-y divide-slate-100 rounded-3xl bg-white px-5 shadow-sm ring-1 ring-slate-100">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-5 w-5" /></span>
            <div><p className="text-xs font-bold text-slate-400">{label}</p><p className="font-extrabold text-slate-800">{value}</p></div>
          </div>
        ))}
      </section>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-3xl bg-emerald-50/80 p-4 ring-1 ring-emerald-200/50 transition hover:bg-emerald-100/60"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500 text-white shadow-sm">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-emerald-950">Layanan Bantuan CS</p>
            <p className="text-xs font-semibold text-emerald-700">Hubungi kami via WhatsApp</p>
          </div>
        </div>
        <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm">
          Chat WA
        </span>
      </a>

      {user.role === "admin" && <Link to="/admin" className="flex items-center justify-center gap-2 rounded-2xl bg-primary-50 py-3.5 font-bold text-primary-700"><LayoutDashboard className="h-5 w-5" />Buka Admin Panel</Link>}
      <Button variant="danger" icon={LogOut} onClick={onLogout} className="w-full">Keluar</Button>

      <Modal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Ubah Profil"
      >
        <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
          <Input
            label="Nama Lengkap"
            value={editForm.name}
            error={editErrors.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nama sesuai KTP"
          />
          <Input
            label="Username"
            value={editForm.username}
            error={editErrors.username}
            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
            placeholder="huruf kecil / angka"
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            error={editErrors.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="nama@email.com"
          />
          <Input
            label="No HP"
            inputMode="numeric"
            value={editForm.phone}
            error={editErrors.phone}
            onChange={(e) => setEditForm((f) => ({ ...f, phone: digitsOnly(e.target.value) }))}
            placeholder="081234567890"
          />
          <Input
            label="Password Baru (Opsional)"
            type={showPass ? "text" : "password"}
            value={editForm.password}
            error={editErrors.password}
            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Kosongkan jika tidak ingin ubah password"
            helper="Minimal 6 karakter jika ingin mengubah password akun Anda."
            right={
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Sembunyikan password" : "Lihat password"}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
