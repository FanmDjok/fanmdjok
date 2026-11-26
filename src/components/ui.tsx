import type { ReactNode, ButtonHTMLAttributes } from "react";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>{children}</section>
);
export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-sm font-semibold text-primary">{children}</p>
);
export const PageTitle = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => (
  <header className="mb-5">
    <Eyebrow>{eyebrow}</Eyebrow>
    <h1 className="mt-1 text-2xl font-bold leading-tight">{title}</h1>
    {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
  </header>
);
export const Btn = ({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) => (
  <button
    {...p}
    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
      variant === "primary" ? "bg-primary text-white hover:bg-[#1565c0]" : "border border-line bg-white text-ink hover:bg-soft"
    } ${className}`}
  />
);
export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);
export const inputCls = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
export const Empty = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => (
  <div className="py-8 text-center">
    <h3 className="font-semibold">{title}</h3>
    <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
