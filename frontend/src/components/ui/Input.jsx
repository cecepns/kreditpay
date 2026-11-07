export default function Input({ label, error, as: Tag = "input", right, className = "", children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-400">{label}</span>}
      <span className="relative block">
        <Tag
          className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 font-semibold text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none ${right ? "pr-12" : ""} ${error ? "border-red-400" : "border-slate-100"} ${className}`}
          {...props}
        >
          {children}
        </Tag>
        {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
      </span>
      {error && <span className="mt-1.5 block text-sm font-semibold text-red-500">{error}</span>}
    </label>
  );
}
