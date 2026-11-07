import { ArrowDownLeft, ArrowUpRight, Plus, ReceiptText } from "lucide-react";

export const TX_META = {
  topup: { icon: Plus, tone: "bg-emerald-50 text-emerald-600", sign: "+" },
  transfer_in: { icon: ArrowDownLeft, tone: "bg-emerald-50 text-emerald-600", sign: "+" },
  transfer_out: { icon: ArrowUpRight, tone: "bg-primary-50 text-primary-700", sign: "-" },
  ppob: { icon: ReceiptText, tone: "bg-amber-50 text-amber-600", sign: "-" },
};
