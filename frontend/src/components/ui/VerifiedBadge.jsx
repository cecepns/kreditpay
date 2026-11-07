export default function VerifiedBadge({ className = "", size = "md" }) {
  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex items-center overflow-hidden rounded-md border-2 border-[#E67E22] bg-[#E67E22] shadow-xs select-none ${
        isSm ? "h-5" : "h-7"
      } ${className}`}
      title="Akun Terverifikasi"
    >
      {/* Box Centang Kiri (Putih) */}
      <div className={`flex items-center justify-center bg-white h-full ${isSm ? "px-1" : "px-1.5"}`}>
        <svg
          viewBox="0 0 24 24"
          className={`${isSm ? "h-3 w-3" : "h-4 w-4"} text-[#E67E22]`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 5 9 17 4 12" />
        </svg>
      </div>

      {/* Box Teks Kanan (Oranye VERIFIED) */}
      <div className={`flex items-center justify-center bg-[#E67E22] h-full ${isSm ? "px-1.5" : "px-2"}`}>
        <span
          className={`font-black text-white uppercase italic tracking-wider leading-none ${
            isSm ? "text-[9px]" : "text-[11px]"
          }`}
          style={{ letterSpacing: "0.06em" }}
        >
          VERIFIED
        </span>
      </div>
    </div>
  );
}

