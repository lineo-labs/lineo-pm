import { useState } from "react";

import type { Project } from "../lib/types";
import { CreateProjectButton } from "./CreateProjectButton";
import { CreateProjectForm } from "./CreateProjectForm";
import { ProjectSelector } from "./ProjectSelector";
import logo from "../assets/logo.png";

interface SidebarProps {
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
  onCreateProject: (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
}

export const Sidebar = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: SidebarProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateProject = async (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => {
    await onCreateProject(payload);
    setShowCreateForm(false);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="flex flex-col items-center gap-2">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-600)] to-[var(--accent-400)] shadow-md"
          aria-hidden="true"
        >
          <img src={logo} alt="logo" className="h-10 w-auto" />
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-100">Time-centric, easy, fast.</p>
      </header>

      <div>
        <CreateProjectButton
          onClick={() => setShowCreateForm((prev) => !prev)}
        />
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 p-3 card-elev-1 transition-base">
          <CreateProjectForm onSubmit={handleCreateProject} />
        </div>
      )}

      <nav aria-label="Project list" className="mt-2">
        <div className="rounded-lg border border-slate-800/30 bg-gradient-to-b from-transparent to-slate-900/20 p-3">
          <ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
          />
        </div>
      </nav>

      <div className="mt-auto">
        <div className="text-xs text-slate-400">v0.1 • MVP layout</div>
      </div>
    </div>
  );
};
