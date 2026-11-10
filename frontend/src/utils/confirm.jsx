import toast from "react-hot-toast";

/** Konfirmasi berbasis toast. Resolve true jika dikonfirmasi, false jika dibatalkan. */
export function confirmToast({ title, message, confirmText = "Ya, lanjutkan", variant = "danger" }) {
  const btnCls =
    variant === "primary"
      ? "bg-primary-700 hover:bg-primary-800"
      : "bg-red-500 hover:bg-red-600";
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div className={`w-80 max-w-[92vw] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 ${t.visible ? "animate-enter" : "animate-leave"}`}>
          <p className="font-extrabold text-slate-800">{title}</p>
          {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={() => { toast.dismiss(t.id); resolve(false); }}>
              Batal
            </button>
            <button className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${btnCls}`} onClick={() => { toast.dismiss(t.id); resolve(true); }}>
              {confirmText}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  });
}
