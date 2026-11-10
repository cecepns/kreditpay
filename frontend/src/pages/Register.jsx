import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BellRing, CheckCircle2, Lock } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Logo from "@/components/Logo";
import PushPermissionModal from "@/components/auth/PushPermissionModal";
import { digitsOnly } from "@/utils/format";
import { getLocalPushReadiness } from "@/utils/push";

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

  const [pushChecking, setPushChecking] = useState(true);
  const [pushState, setPushState] = useState(null);
  const [pushModalOpen, setPushModalOpen] = useState(false);

  const refreshPushState = useCallback(async (openIfNotReady = false) => {
    const res = await getLocalPushReadiness();
    setPushState(res);
    setPushChecking(false);
    if (res.ready) {
      setPushModalOpen(false);
    } else if (openIfNotReady) {
      setPushModalOpen(true);
    }
    return res;
  }, []);

  useEffect(() => {
    refreshPushState(true);

    const onResume = () => {
      if (document.visibilityState === "visible") {
        refreshPushState(false);
      }
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [refreshPushState]);

  const change = (f) => (e) => setForm({ ...form, [f.name]: f.name === "phone" ? digitsOnly(e.target.value) : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);

    let currentPush = pushState;
    if (!currentPush?.ready || !currentPush?.subscription) {
      currentPush = await refreshPushState(false);
    }
    if (!currentPush?.ready || !currentPush?.subscription) {
      toast.error("Wajib mengaktifkan izin notifikasi sebelum mendaftar akun");
      setPushModalOpen(true);
      return;
    }

    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await register({ ...form, push_subscription: currentPush.subscription });
      toast.success("Pendaftaran berhasil");
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pushReady = Boolean(pushState?.ready && pushState?.subscription);

  return (
    <div className="min-h-screen bg-slate-100">
      <form onSubmit={submit} noValidate className="mx-auto min-h-screen max-w-md bg-white px-6 py-10 shadow-xl">
        <div className="mb-4">
          <Logo size="md" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Buat Akun 🚀</h1>
        <p className="mb-6 mt-1 font-semibold text-slate-500">Daftar gratis, langsung dapat limit Pinjaman.</p>

        {/* Status Wajib Notifikasi Push */}
        {pushChecking ? (
          <div className="mb-6 h-14 animate-pulse rounded-2xl bg-slate-100" />
        ) : pushReady ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200/80">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-emerald-950">Pastikan Data Anda Sesuai dengan KTP</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
                <BellRing className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-amber-950">Wajib Aktifkan Notifikasi</p>
                <p className="text-[11px] font-semibold text-amber-800">Aktifkan izin notifikasi untuk bisa mendaftar.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPushModalOpen(true)}
              className="shrink-0 rounded-xl bg-primary-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-primary-800 transition"
            >
              Aktifkan
            </button>
          </div>
        )}

        <div className="space-y-4">
          {FIELDS.map((f) => <Input key={f.name} {...f} value={form[f.name]} error={errors[f.name]} onChange={change(f)} />)}
        </div>

        <Button
          type="submit"
          loading={loading}
          icon={!pushChecking && !pushReady ? Lock : undefined}
          className="mt-8 h-14 w-full text-lg"
        >
          {pushChecking || pushReady ? "Daftar Sekarang" : "Aktifkan Notifikasi & Daftar"}
        </Button>

        <p className="mt-6 text-center font-semibold text-slate-500">
          Sudah punya akun? <Link to="/login" className="font-extrabold text-accent-600">Masuk</Link>
        </p>
      </form>

      <PushPermissionModal
        open={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        required
        status={pushState}
        onRecheck={() => refreshPushState(false)}
        onActivated={async () => {
          await refreshPushState(false);
          setPushModalOpen(false);
        }}
      />
    </div>
  );
}
