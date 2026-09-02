"use client";

import { profile } from "@/content/profile";
import { experience } from "@/content/experience";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { galleryImages } from "@/content/gallery";
import {
  profileVi,
  experienceVi,
  projectsVi,
  skillGroupsVi,
  galleryImagesVi,
} from "@/content/vi";
import { useLocale } from "./LocaleProvider.client";

const CONTENT = {
  en: { profile, experience, projects, skillGroups, galleryImages },
  vi: {
    profile: profileVi,
    experience: experienceVi,
    projects: projectsVi,
    skillGroups: skillGroupsVi,
    galleryImages: galleryImagesVi,
  },
};

/**
 * The structured content data (profile, experience, projects, skills, gallery)
 * for the active locale. Same shapes as the English source modules, so callers
 * just swap `import { experience }` for `const { experience } = useContent()`.
 */
export function useContent() {
  const { locale } = useLocale();
  return CONTENT[locale];
}
