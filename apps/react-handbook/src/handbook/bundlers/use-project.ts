"use client";

import { useState } from "react";

import type { Project } from "./projects";

/** Editable copy of a sample project. */
export function useProject(initial: Project) {
  const [files, setFiles] = useState<Project>(initial);
  const [base, setBase] = useState<Project>(initial);
  // A different sample replaces the files (e.g. switching presets).
  if (base !== initial) {
    setBase(initial);
    setFiles(initial);
  }
  function update(path: string, code: string) {
    setFiles((current) => ({ ...current, [path]: code }));
  }
  function reset() {
    setFiles(initial);
  }
  return { files, update, reset, changed: files !== initial };
}
