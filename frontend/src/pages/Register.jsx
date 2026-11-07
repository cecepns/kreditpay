import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { digitsOnly } from "@/utils/format";

const FIELDS = [
  { name: "name", label: "Nama lengkap", placeholder: "Nama sesuai KTP" },
  { name: "username", label: "Username", placeholder: "huruf kecil / angka", autoComplete: "username" },
  { name: "email", label: "Email", type: "email", placeholder: "nama@email.com" },
  { name: "phone", label: "No HP", inputMode: "numeric", placeholder: "081234567890" },
  { name: "password", label: "Password", type: "password", placeholder: "Minimal 6 karakter", autoComplete: "new-password" },
];

const validate = (v) => {
  const e = {};
  if (v.name.trim().length < 3) e.name = "Nama minimal 3 karakter";
  if (!/^[a-z0-9_.]{4,30}$/.test(v.username.toLowerCase())) e.username = "4-30 karakter: huruf, angka, titik, underscore";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Format email tidak valid";
  if (!/^(\+62|62|0)8\d{8,12}$/.test(v.phone)) e.phone = "No HP tidak valid";
  if (!v.password || v.password.length < 6) e.password = "Password minimal 6 karakter";
  return e;
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const change = (f) => (e) => setForm({ ...form, [f.name]: f.name === "phone" ? digitsOnly(e.target.value) : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register(form);
      toast.success("Pendaftaran berhasil");
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <form onSubmit={submit} noValidate className="mx-auto min-h-screen max-w-md bg-white px-6 py-10 shadow-xl">
        <h1 className="text-3xl font-extrabold text-slate-900">Buat Akun 🚀</h1>
        <p className="mb-8 mt-1 font-semibold text-slate-500">Daftar gratis, langsung dapat limit Pinjaman.</p>
        <div className="space-y-4">
          {FIELDS.map((f) => <Input key={f.name} {...f} value={form[f.name]} error={errors[f.name]} onChange={change(f)} />)}
        </div>
        <Button type="submit" loading={loading} className="mt-8 h-14 w-full text-lg">Daftar Sekarang</Button>
        <p className="mt-6 text-center font-semibold text-slate-500">Sudah punya akun? <Link to="/login" className="font-extrabold text-accent-600">Masuk</Link></p>
      </form>
    </div>
  );
}
