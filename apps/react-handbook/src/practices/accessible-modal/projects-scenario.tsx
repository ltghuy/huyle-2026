"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";

import { confirm } from "./modal-store";

const INITIAL = ["Website redesign", "Mobile app", "Quarterly report", "Onboarding flow"];
const EXTRA = ["Billing migration", "Design system", "Help center", "Partner API"];

type Project = { id: number; name: string };

function initialProjects(): Project[] {
  return INITIAL.map((name, i) => ({ id: i + 1, name }));
}

export function ProjectsScenario() {
  const [projects, setProjects] = useState(initialProjects);
  const nextId = useRef(INITIAL.length + 1);
  const listRef = useRef<HTMLUListElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);

  /** After a delete: the row now at that position, the one before, or "New project". */
  function fallbackAt(index: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-delete]");
    return buttons?.[index] ?? buttons?.[index - 1] ?? newRef.current;
  }

  async function deleteProject(project: Project, index: number) {
    const confirmed = await confirm({
      title: `Delete “${project.name}”?`,
      description: "The project and its files will be removed. This can't be undone.",
      confirmLabel: "Delete project",
      destructive: true,
      returnFocus: () => fallbackAt(index),
    });
    if (!confirmed) return;
    // Remove the row before focus returns (next frame), so focus goes to
    // the fallback instead of a button that is about to disappear.
    flushSync(() => setProjects((current) => current.filter((p) => p.id !== project.id)));
    toast.success("Project deleted", { description: project.name });
  }

  function handleDelete(project: Project, index: number) {
    void deleteProject(project, index);
  }

  function handleNew() {
    const id = nextId.current++;
    setProjects((current) => [...current, { id, name: EXTRA[(id - 1) % EXTRA.length] }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {projects.length > 0 ? (
        <ul ref={listRef} aria-label="Projects" className="flex flex-col divide-y rounded-lg border">
          {projects.map((project, index) => (
            <li key={project.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="truncate">{project.name}</span>
              <Button
                variant="ghost"
                size="sm"
                data-delete
                aria-label={`Delete ${project.name}`}
                onClick={() => handleDelete(project, index)}
              >
                <Trash2 aria-hidden /> Delete
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-foreground/75">No projects left.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button ref={newRef} variant="outline" size="sm" onClick={handleNew}>
          <Plus aria-hidden /> New project
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setProjects(initialProjects())}>
          <RotateCcw aria-hidden /> Reset projects
        </Button>
      </div>
    </div>
  );
}
