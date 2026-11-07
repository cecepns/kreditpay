import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-primary-700 text-white shadow-lg shadow-primary-700/25 hover:bg-primary-800",
  soft: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
  danger: "bg-red-500 text-white hover:bg-red-600",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export default function Button({ variant = "primary", loading = false, icon: Icon, children, className = "", disabled, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
