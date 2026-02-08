import { useState } from "react";

import type { Project } from "../lib/types";
import { CreateProjectButton } from "./CreateProjectButton";
import { CreateProjectForm } from "./CreateProjectForm";
import { ProjectSelector } from "./ProjectSelector";

interface SidebarProps {
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (projectId: number) => void;
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
      <div>
        <h1 className="text-lg font-semibold tracking-tight">novux-pm</h1>
        <p className="mt-1 text-xs text-slate-400">AI-native, calm, fast.</p>
      </div>

      <CreateProjectButton onClick={() => setShowCreateForm((prev) => !prev)} />

      {showCreateForm && <CreateProjectForm onSubmit={handleCreateProject} />}

      <ProjectSelector
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />

      <div className="mt-auto text-xs text-slate-500">
        v0.1 • MVP layout
      </div>
    </div>
  );
};
