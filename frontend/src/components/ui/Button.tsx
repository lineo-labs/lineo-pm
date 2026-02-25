import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost" | "outline" | "success";
  size?: "sm" | "md";
  children?: ReactNode;
}

const base = "rounded-md inline-flex items-center justify-center font-semibold shadow-sm transition-base focus:outline-none focus-visible:ring-2";

const variantMap: Record<string, string> = {
  primary:
    "bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-600)] text-white shadow-md hover:scale-[1.02] focus-visible:ring-[var(--accent-400)]",
  danger: "bg-red-600 text-white border-red-700",
  success: "bg-emerald-500 text-white border-emerald-600",
  ghost: "bg-transparent text-slate-200 border-slate-700",
  outline: "bg-transparent text-slate-200 border-slate-700",
};

export const Button = ({ variant = "ghost", size = "sm", className = "", children, ...props }: ButtonProps) => {
  const sizeClass = size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-2";
  const variantClass = variantMap[variant] ?? variantMap.ghost;
  return (
    <button {...props} className={`${base} ${sizeClass} ${variantClass} ${className}`.trim()}>
      {children}
    </button>
  );
};

export default Button;
