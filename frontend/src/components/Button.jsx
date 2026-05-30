export function Button({ children, onClick, disabled, variant = "primary", className = "" }) {
  const base = "px-4 py-2 rounded-md font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-500",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
