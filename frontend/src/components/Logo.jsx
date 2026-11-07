import { ArrowUpRight } from "lucide-react";

export default function Logo({ size = "md" }) {
  const box = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <span className="inline-flex items-center gap-3 font-display">
      <span className={`grid ${box} place-items-center rounded-xl bg-primary-700 text-white`}><ArrowUpRight className="h-6 w-6" strokeWidth={3} /></span>
      <span className="text-2xl font-bold text-slate-800">Kredit<span className="bg-gradient-to-r from-indigo-500 to-accent-400 bg-clip-text text-transparent">Pay</span></span>
    </span>
  );
}
