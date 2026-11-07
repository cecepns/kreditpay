const Card = ({ x, y, rot, accent, face }) => (
  <g transform={`rotate(${rot} ${x + 50} ${y + 70})`}>
    <rect x={x} y={y} width="100" height="140" rx="14" fill="#f1f1f4" stroke="#1f2340" strokeWidth="3" />
    <rect x={x} y={y} width="100" height="52" rx="14" fill={accent} />
    <circle cx={x + 50} cy={y + 8} r="26" fill={face} stroke="#1f2340" strokeWidth="3" />
    {[78, 98, 118].map((o) => <rect key={o} x={x + 30} y={y + o} width="56" height="8" rx="4" fill="#d6d7de" />)}
  </g>
);

export default function LoginIllustration() {
  return (
    <svg
      viewBox="0 -16 320 206"
      className="mx-auto h-40 w-auto overflow-visible"
      role="img"
      aria-label="Ilustrasi akun pengguna"
    >
      <Card x={40} y={30} rot={-8} accent="#3b82f6" face="#60a5fa" />
      <Card x={190} y={30} rot={8} accent="#facc15" face="#fde68a" />
      <Card x={110} y={14} rot={0} accent="#fda4af" face="#fb7185" />
    </svg>
  );
}
