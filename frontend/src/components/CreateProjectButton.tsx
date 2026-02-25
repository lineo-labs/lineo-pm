import type { ButtonHTMLAttributes } from "react";

interface CreateProjectButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
}

export const CreateProjectButton = ({ onClick, className = "", ...props }: CreateProjectButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"w-full rounded-lg bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-600)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] " + className}
      {...props}
    >
      Create project
    </button>
  );
};
