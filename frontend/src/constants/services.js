import { Droplet, Gamepad2, HeartPulse, MoreHorizontal, Smartphone, Tv, Wifi, Zap } from "lucide-react";

export const SERVICES = [
  { key: "pulsa", label: "Pulsa", icon: Smartphone, tone: "bg-blue-50 text-blue-500", targetLabel: "No HP", placeholder: "081234567890" },
  { key: "internet", label: "Internet", icon: Wifi, tone: "bg-emerald-50 text-emerald-500", targetLabel: "ID Pelanggan", placeholder: "Contoh: 1234567890" },
  { key: "pln", label: "PLN", icon: Zap, tone: "bg-yellow-50 text-yellow-500", targetLabel: "No Meter / ID Pelanggan", placeholder: "Contoh: 5312345678" },
  { key: "pdam", label: "PDAM", icon: Droplet, tone: "bg-red-50 text-red-500", targetLabel: "No Pelanggan", placeholder: "Contoh: 01234567" },
  { key: "games", label: "Games", icon: Gamepad2, tone: "bg-purple-50 text-purple-500", targetLabel: "User ID Game", placeholder: "Contoh: 123456789" },
  { key: "bpjs", label: "BPJS", icon: HeartPulse, tone: "bg-pink-50 text-pink-500", targetLabel: "No VA BPJS", placeholder: "Contoh: 8801234567890" },
  { key: "tvkabel", label: "TV Kabel", icon: Tv, tone: "bg-indigo-50 text-indigo-500", targetLabel: "ID Pelanggan", placeholder: "Contoh: 1234567" },
  { key: "lainnya", label: "Lainnya", icon: MoreHorizontal, tone: "bg-slate-100 text-slate-500", targetLabel: "Nomor Tujuan", placeholder: "Nomor tujuan" },
];

export const PROMOS = [
  { id: 1, tag: "FOOD", title: "Diskon Rp 20rb Merchant Pilihan", style: "from-emerald-500 to-accent-500" },
  { id: 2, tag: "PAYLATER", title: "Cicilan 0% untuk 3 bulan pertama", style: "from-indigo-500 to-primary-600" },
  { id: 3, tag: "PULSA", title: "Cashback 10% isi pulsa pertama", style: "from-rose-500 to-orange-400" },
];
