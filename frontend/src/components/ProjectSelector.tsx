import { useMemo, useState } from "react";

import type { Project } from "../lib/types";

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (projectId: number) => void;
}

export const ProjectSelector = ({
  projects,
  selectedProjectId,
  onSelectProject,
}: ProjectSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }
    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedQuery)
    );
  }, [projects, query]);

  return (
    <div className="relative">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Active project
      </label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-slate-700"
      >
        <div className="flex items-center justify-between">
          <span>{selectedProject?.name ?? "Select project"}</span>
          <span className="text-slate-500">▾</span>
        </div>
        {selectedProject?.description && (
          <p className="mt-1 text-xs text-slate-400">
            {selectedProject.description}
          </p>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-xl shadow-slate-950/60">
          <input
            type="text"
            placeholder="Quick search..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          />
          <ul className="mt-2 max-h-56 overflow-y-auto scrollbar-gantt">
            {filteredProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectProject(project.id);
                    setOpen(false);
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-900"
                >
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-slate-500">
                      {project.description}
                    </div>
                  )}
                </button>
              </li>
            ))}
            {filteredProjects.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-500">
                No projects found.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
