export function Card({ children, className = "" }) {
  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}
