import type { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export const AppShell = ({ sidebar, main }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-900 bg-slate-950/90 p-4">
          {sidebar}
        </aside>
        <main className="p-6">{main}</main>
      </div>
    </div>
  );
};
