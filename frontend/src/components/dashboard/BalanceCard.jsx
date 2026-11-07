import { Send, Plus, Wallet, Zap } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/StateViews";
import { formatRupiah } from "@/utils/format";

export default function BalanceCard({ summary, loading, userLevel, onTopUp, onTransfer, onApplyPaylater }) {
  const pl = summary?.paylater;
  const pct = pl && pl.limit > 0 ? Math.max(0, Math.min(100, (pl.available / pl.limit) * 100)) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-slate-100" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-400">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-700 text-white"><Wallet className="h-5 w-5" /></span>Saldo Utama
          </div>
          {userLevel && (
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-black text-primary-700 ring-1 ring-primary-200">
              Level {userLevel}
            </span>
          )}
        </div>
        {loading ? <Skeleton className="mt-3 h-10 w-56" /> : <p className="mt-2 text-3xl font-extrabold text-slate-800">{formatRupiah(summary?.balance)}</p>}
        <div className="mt-4 flex gap-3">
          <Button variant="soft" icon={Plus} onClick={onTopUp} className="!rounded-full !px-5 !py-2.5 text-sm">Top Up</Button>
          <Button variant="soft" icon={Send} onClick={onTransfer} className="!rounded-full !px-5 !py-2.5 text-sm">Transfer</Button>
        </div>
      </div>

      <hr className="my-5 border-slate-100" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-400">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-500 text-white"><Zap className="h-5 w-5" fill="currentColor" /></span>Saldo PayLater
          </div>
          <button onClick={onApplyPaylater || (() => toast("Pengajuan limit segera hadir", { icon: "ℹ️" }))} className="rounded-full bg-primary-700 px-4 py-1.5 text-xs font-extrabold uppercase text-white hover:bg-primary-800">Ajukan</button>
        </div>
        {loading ? <Skeleton className="mt-3 h-10 w-64" /> : <p className="mt-2 text-3xl font-extrabold text-slate-800">{formatRupiah(pl?.available)}</p>}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-accent-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-right text-xs font-semibold text-slate-400">Sisa Limit Tersedia</p>
      </div>
    </section>
  );
}
