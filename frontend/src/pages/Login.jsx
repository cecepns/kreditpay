import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoginIllustration from "@/components/LoginIllustration";
import FloatingInstallButton from "@/components/FloatingInstallButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.identifier.trim()) errs.identifier = "Isi username, email, atau No HP";
    if (!form.password) {
      errs.password = "Password wajib diisi";
    } else if (form.password.length < 6) {
      errs.password = "Password minimal 6 karakter";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const user = await login(form.identifier.trim(), form.password);
      toast.success("Berhasil masuk");
      navigate(user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <form onSubmit={submit} noValidate className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-6 py-10 shadow-xl">
        <h1 className="text-3xl font-extrabold text-slate-900">Selamat Datang! 👋</h1>
        <p className="mt-1 font-semibold text-slate-500">Masuk untuk mulai bertransaksi.</p>
        <div className="my-8"><LoginIllustration /></div>

        <div className="space-y-5">
          <Input
            label="Username / Email / No HP"
            placeholder="Masukkan data..."
            autoComplete="username"
            value={form.identifier}
            error={errors.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          />
          <Input
            label="Password"
            type={show ? "text" : "password"}
            placeholder="Masukkan password"
            autoComplete="current-password"
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            right={
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                className="text-slate-400 hover:text-slate-600"
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />
          <div className="text-right">
            <button
              type="button"
              onClick={() => toast("Hubungi bantuan untuk reset password", { icon: "ℹ️" })}
              className="text-sm font-extrabold text-accent-600"
            >
              Lupa Password?
            </button>
          </div>
        </div>

        <div className="mt-auto pt-10 pb-20">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => toast("Login sidik jari belum tersedia", { icon: "ℹ️" })}
              aria-label="Masuk dengan sidik jari"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-slate-50 text-primary-700"
            >
              <Fingerprint className="h-7 w-7" />
            </button>
            <Button type="submit" loading={loading} className="h-14 flex-1 text-lg">Masuk Sekarang</Button>
          </div>
          <p className="mt-6 text-center font-semibold text-slate-500">
            Belum punya akun? <Link to="/register" className="font-extrabold text-accent-600">Daftar disini</Link>
          </p>
        </div>
      </form>

      {/* Floating Install App Banner */}
      <FloatingInstallButton />
    </div>
  );
}
