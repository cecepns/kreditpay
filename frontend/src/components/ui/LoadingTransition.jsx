import { Loader2 } from "lucide-react";

export default function LoadingTransition({
  title = "Memproses...",
  subtitle = "Mohon tunggu sebentar selagi sistem menyiapkan data Anda.",
  progressKey = "loading",
}) {
  return (
    <div className="py-10 px-2 text-center space-y-5">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-40" />
        <span className="relative grid h-20 w-20 place-items-center rounded-full bg-primary-50 text-primary-700 ring-4 ring-primary-100 shadow-inner">
          <Loader2 className="h-10 w-10 animate-spin" />
        </span>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-black text-slate-900">
          {title}
        </h3>
        {subtitle && (
          <p className="mx-auto max-w-xs text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-xs space-y-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
          <div
            key={progressKey}
            className="animate-progress-5s h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-[#00D1B2]"
          />
        </div>
        <p className="text-[11px] font-bold text-slate-400">
          Mohon tunggu sebentar...
        </p>
      </div>
    </div>
  );
}

