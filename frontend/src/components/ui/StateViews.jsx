import { AlertTriangle, Inbox } from "lucide-react";
import Button from "@/components/ui/Button";

export const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;

export function EmptyState({ icon: Icon = Inbox, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-slate-300"><Icon className="h-9 w-9" /></div>
      <p className="font-bold text-slate-400">{text}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-500"><AlertTriangle className="h-7 w-7" /></div>
      <p className="font-bold text-slate-600">{message}</p>
      {onRetry && <Button variant="soft" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}

export const ListSkeleton = ({ rows = 4 }) => (
  <div className="space-y-3 p-4">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
);
