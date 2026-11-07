import {
  Lock,
  CreditCard,
  ShieldCheck,
  ArrowLeftRight,
  Wrench,
  Settings,
  Crown,
} from "lucide-react";

export const USER_LEVELS = [
  {
    level: 1,
    title: "Level 1",
    subtitle: "Pop-up Terkunci",
    description: "Semua fitur transaksi di-lock. Pengguna wajib melakukan Top Up saldo terlebih dahulu.",
    icon: Lock,
    tone: "bg-slate-100 text-slate-700",
  },
  {
    level: 2,
    title: "Level 2",
    subtitle: "Info Autodebet",
    description: "Transfer membutuhkan integrasi Autodebet. Transaksi Pulsa/PPOB menampilkan error Mode Paylater.",
    icon: CreditCard,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    level: 3,
    title: "Level 3",
    subtitle: "Info Asuransi",
    description: "Akun terintegrasi asuransi transaksi digital. Akses transaksi dibuka dengan jaminan proteksi asuransi.",
    icon: ShieldCheck,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    level: 4,
    title: "Level 4",
    subtitle: "Pindah Saldo",
    description: "Akses pemindahan saldo antar dompet digital dan rekening eksternal.",
    icon: ArrowLeftRight,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    level: 5,
    title: "Level 5",
    subtitle: "Pengembangan 1",
    description: "Fitur transaksi prioritas dengan limit lebih tinggi.",
    icon: Wrench,
    tone: "bg-yellow-50 text-yellow-600",
  },
  {
    level: 6,
    title: "Level 6",
    subtitle: "Pengembangan 2",
    description: "Layanan skala bisnis dengan integrasi multi-channel.",
    icon: Settings,
    tone: "bg-rose-50 text-rose-600",
  },
  {
    level: 7,
    title: "Level 7",
    subtitle: "Fitur VIP/Prioritas",
    description: "Akses VIP penuh ke seluruh fitur tanpa batas.",
    icon: Crown,
    tone: "bg-purple-50 text-purple-600",
  },
];

