import { Link } from "react-router-dom";
import { Rocket, ShieldCheck, Timer, Wallet, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import FloatingInstallButton from "@/components/FloatingInstallButton";
import useAuth from "@/hooks/useAuth";
import heroImage from "@/assets/image-landing.avif";

const FEATURES = [
  { icon: Wallet, title: "Limit hingga Rp 200 juta", text: "Belanja dulu, bayar nanti dengan cicilan yang kamu pilih sendiri." },
  { icon: Timer, title: "Tagihan beres dalam detik", text: "Pulsa, listrik, internet, BPJS, hingga TV kabel dari satu aplikasi." },
  { icon: ShieldCheck, title: "Dilindungi password aman", text: "Setiap akun dan transaksi diamankan dengan password pilihanmu." },
];

export default function Landing() {
  const { user } = useAuth();
  const home = user ? (user.role === "admin" ? "/admin" : "/app") : "/login";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50/60 font-display">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6">
        <Link to="/" className="shrink-0 transition hover:opacity-95">
          <Logo />
        </Link>
        <Link
          to={home}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-primary-600 bg-white px-3.5 py-1.5 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-black text-primary-700 shadow-xs transition hover:bg-primary-50 active:scale-95 shrink-0"
        >
          <span>{user ? "Buka Aplikasi" : "Masuk"}</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary-600" />
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-2 lg:pt-14">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100/70 px-4 py-2 text-sm font-bold text-indigo-700"><Rocket className="h-4 w-4" />Solusi Keuangan Digital #1</span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Beli Apapun,<br />
            <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-accent-400 bg-clip-text text-transparent">Bayar Nanti Aja.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md font-sans text-lg font-semibold text-slate-500 lg:mx-0">
            Nikmati kemudahan transaksi tanpa kartu kredit bersama <b className="text-slate-700">KreditPay</b>. Limit hingga <b className="text-slate-700">Rp 200.000.000</b>.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            {user ? (
              <>
                <Link
                  to={home}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-700 px-8 py-4 text-center font-bold text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-95"
                >
                  <span>Buka Dashboard Aplikasi</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/app/akun"
                  className="w-full sm:w-auto rounded-2xl px-6 py-4 text-center font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Akun ({user.name})
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto rounded-2xl bg-primary-700 px-8 py-4 text-center font-bold text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800"
                >
                  Daftar Sekarang
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto rounded-2xl px-8 py-4 text-center font-bold text-primary-700 transition hover:bg-primary-50"
                >
                  Sudah punya akun
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <img src={heroImage} alt="Ilustrasi pengajuan kredit kendaraan" className="aspect-square w-64 rounded-xl bg-white object-cover shadow-2xl shadow-indigo-200/70 sm:w-80 lg:w-[26rem]" />
        </div>
      </main>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-700"><Icon className="h-6 w-6" /></span>
            <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
            <p className="mt-1 font-sans font-semibold text-slate-500">{text}</p>
          </div>
        ))}
      </section>
      <footer className="pb-24 sm:pb-8 text-center font-sans text-sm font-semibold text-slate-400">© {new Date().getFullYear()} KreditPay</footer>
      <FloatingInstallButton />
    </div>
  );
}
