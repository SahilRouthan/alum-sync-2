import { useState } from "react";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";

export function Avatar({ name = "User", src, size = "md" }) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };
  const initials = String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border border-slate-200 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 text-white font-semibold flex items-center justify-center shrink-0`}
    >
      {initials || "U"}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, accent = "brand" }) {
  const accents = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accents[accent] || accents.brand}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();
  const map = {
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    upcoming: "bg-sky-50 text-sky-700 border-sky-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
        map[normalized] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

export function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
      <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center justify-between gap-4 mb-5">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, emptyMessage = "No records found." }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-sm text-slate-700 align-middle">
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkillTagInput({ value = [], onChange, placeholder = "Add a skill and press Enter" }) {
  const [input, setInput] = useState("");

  const addSkill = () => {
    const cleaned = input.trim();
    if (!cleaned) return;
    if (!value.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
      onChange([...value, cleaned]);
    }
    setInput("");
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={addSkill}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(value.filter((s) => s !== skill))}
                className="hover:text-brand-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
