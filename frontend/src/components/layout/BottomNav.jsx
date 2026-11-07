import { NavLink } from "react-router-dom";

function HomeIcon({ isActive, className = "h-6 w-6" }) {
  if (!isActive) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        fill="currentColor"
      />
      <path
        d="M9 22V13.5a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5V22"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RiwayatIcon({ isActive, className = "h-6 w-6" }) {
  if (!isActive) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
        fill="currentColor"
      />
      <path
        d="M14 2v4a2 2 0 0 0 2 2h4"
        fill="currentColor"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="8" y1="9" x2="11" y2="9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="17" x2="16" y2="17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NotifikasiIcon({ isActive, className = "h-6 w-6" }) {
  if (!isActive) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        fill="currentColor"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AkunIcon({ isActive, className = "h-6 w-6" }) {
  if (!isActive) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="7" r="4" fill="currentColor" />
      <path
        d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2z"
        fill="currentColor"
      />
    </svg>
  );
}

const ITEMS = [
  { to: "/app", label: "Beranda", icon: HomeIcon, end: true },
  { to: "/app/riwayat", label: "Riwayat", icon: RiwayatIcon },
  { to: "/app/notifikasi", label: "Notifikasi", icon: NotifikasiIcon },
  { to: "/app/akun", label: "Akun", icon: AkunIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-xl px-4" aria-label="Menu utama">
      <div className="grid grid-cols-4 rounded-3xl bg-white p-2 shadow-xl shadow-slate-300/50 ring-1 ring-slate-100">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition duration-200 ${
                isActive ? "font-extrabold text-primary-700" : "font-semibold text-slate-400 hover:text-slate-600"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon isActive={isActive} className={`h-6 w-6 transition-transform duration-200 ${isActive ? "scale-105" : ""}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
