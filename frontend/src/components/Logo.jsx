import { ArrowUpRight } from "lucide-react";

export default function Logo({ size = "md" }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5 sm:h-6 sm:w-6";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl sm:text-2xl";

  return (
    <span className="inline-flex items-center gap-2 sm:gap-3 font-display select-none">
      <span className={`grid ${box} place-items-center rounded-xl bg-primary-700 text-white shadow-xs`}>
        <ArrowUpRight className={icon} strokeWidth={3} />
      </span>
      <span className={`${text} font-black text-slate-800 tracking-tight`}>
        Kredit<span className="bg-gradient-to-r from-indigo-500 to-accent-400 bg-clip-text text-transparent">Pay</span>
      </span>
    </span>
  );
}
