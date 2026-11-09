import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { post } from "@/utils/request";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordModal({ open, initialEmail = "", onClose, onSuccess }) {
  const [step, setStep] = useState("check"); // "check" | "reset"
  const [email, setEmail] = useState("");
  const [accountInfo, setAccountInfo] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prefill = typeof initialEmail === "string" && initialEmail.includes("@") ? initialEmail.trim() : "";
    setStep("check");
    setEmail(prefill);
    setAccountInfo(null);
    setPassword("");
    setConfirmPassword("");
    setShowPass(false);
    setShowConfirm(false);
    setErrors({});
    setLoading(false);
  }, [open, initialEmail]);

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    const errs = {};
    if (!cleaned) errs.email = "Email wajib diisi";
    else if (!EMAIL_RE.test(cleaned)) errs.email = "Format email tidak valid";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.CHECK_RESET_EMAIL, { email: cleaned });
      setAccountInfo(res.data || { email: cleaned });
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      setStep("reset");
    } catch (err) {
      const msg = err.message || "Email tidak ditemukan";
      setErrors({ email: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!password) errs.password = "Password baru wajib diisi";
    else if (password.length < 6) errs.password = "Password baru minimal 6 karakter";

    if (!confirmPassword) errs.confirmPassword = "Konfirmasi password wajib diisi";
    else if (confirmPassword !== password) errs.confirmPassword = "Konfirmasi password tidak sama";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    const targetEmail = accountInfo?.email || email.trim().toLowerCase();
    setLoading(true);
    try {
      const res = await post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: targetEmail,
        password,
        confirm_password: confirmPassword,
      });
      toast.success(res.message || "Password berhasil direset. Silakan masuk dengan password baru.");
      onSuccess?.(res.data?.email || targetEmail);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Gagal mereset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reset Password">
      {step === "check" ? (
        <form onSubmit={handleCheckEmail} noValidate className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/70 p-3.5 text-xs text-slate-700">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700">
              <Mail className="h-4 w-4" />
            </span>
            <p className="font-semibold leading-relaxed">
              Masukkan alamat email yang terdaftar pada akun Anda.
            </p>
          </div>

          <Input
            label="Email Terdaftar"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="contoh@email.com"
            value={email}
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              Cek Email
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} noValidate className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-extrabold text-emerald-900">Email Ditemukan</p>
                  <p className="mt-0.5 font-semibold text-emerald-800 truncate">
                    {accountInfo?.name ? `${accountInfo.name} · ` : ""}
                    {accountInfo?.email || email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("check");
                  setErrors({});
                }}
                disabled={loading}
                className="shrink-0 text-[11px] font-extrabold text-primary-700 underline hover:text-primary-800"
              >
                Ganti Email
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1">
            <KeyRound className="h-4 w-4 text-primary-600 shrink-0" />
            <span>Silakan buat password baru untuk akun Anda.</span>
          </div>

          <Input
            label="Password Baru"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minimal 6 karakter"
            value={password}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
            }}
            right={
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                className="text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Input
            label="Konfirmasi Password Baru"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
            }}
            right={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                className="text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("check");
                setErrors({});
              }}
              disabled={loading}
            >
              Kembali
            </Button>
            <Button type="submit" loading={loading}>
              Simpan Password Baru
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

