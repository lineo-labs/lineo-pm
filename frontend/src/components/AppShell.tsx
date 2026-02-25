import type { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export const AppShell = ({ sidebar, main }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-900)] to-[var(--bg-850)] text-slate-100">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside
          aria-label="Application sidebar"
          className="border-r border-slate-800/30 bg-slate-900/50 backdrop-blur-sm p-5"
        >
          <div className="h-full flex flex-col">
            {sidebar}
          </div>
        </aside>
        <main
          role="main"
          aria-label="Main content"
          className="p-8"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="rounded-2xl bg-slate-900/40 p-6 card-elev-1 transition-base">
              {main}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
