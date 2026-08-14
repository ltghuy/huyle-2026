import { describe, it, expect } from "vitest";
import { profile } from "./profile";
import { socials } from "./socials";
import { skillGroups } from "./skills";
import { experience } from "./experience";
import { projects } from "./projects";
import { scene } from "./scene";

describe("content model", () => {
  it("profile has all required identity fields", () => {
    (["name", "display", "title", "tagline", "summary", "location", "monogram"] as const).forEach(
      (k) => expect(profile[k]).toBeTruthy(),
    );
    expect(profile.title).toContain("AI-Native");
  });

  it("socials include the expected channels, an email, and NO phone number", () => {
    const icons = socials.map((s) => s.icon);
    (["mail", "linkedin", "github", "instagram", "facebook"] as const).forEach((i) =>
      expect(icons).toContain(i),
    );
    expect(socials.some((s) => s.href.startsWith("mailto:"))).toBe(true);
    // phone digits must never appear anywhere in the socials data
    expect(JSON.stringify(socials)).not.toMatch(/9668|0799668/);
  });

  it("skills expose four non-empty capability groups", () => {
    expect(skillGroups).toHaveLength(4);
    skillGroups.forEach((g) => expect(g.items.length).toBeGreaterThan(0));
  });

  it("experience covers four roles with highlights and tech", () => {
    expect(experience).toHaveLength(4);
    experience.forEach((e) => {
      expect(e.company).toBeTruthy();
      expect(e.highlights.length).toBeGreaterThan(0);
      expect(e.tech.length).toBeGreaterThan(0);
    });
  });

  it("projects are the four spotlighted, ordered, each with tech and links", () => {
    expect(projects).toHaveLength(4);
    projects.forEach((p, idx) => {
      expect(p.index).toBe(idx + 1);
      expect(p.tech.length).toBeGreaterThan(0);
      expect(p.links).toBeDefined();
    });
  });

  it("scene points at the placeholder GLB and maps all clips", () => {
    expect(scene.character).toContain("placeholder-character.glb");
    (["seated", "stand", "idle", "walk", "wave"] as const).forEach((k) =>
      expect(scene.clips[k]).toBeTruthy(),
    );
  });
});
