import type { ApproachId } from "./composition";

// "Should we use micro frontends?" as a short rule list. One example of the
// criteria a senior answer weighs; real decisions also count hiring, budget and
// how much platform work a company can staff.

export type Teams = "one" | "few" | "many";
export type Blocking = "rarely" | "sometimes" | "often";
export type Frameworks = "one" | "migrating" | "several";
export type Layout = "pages" | "mixed";
export type Budget = "tight" | "normal";

export type FitAnswers = {
  teams: Teams;
  blocking: Blocking;
  frameworks: Frameworks;
  layout: Layout;
  seo: boolean;
  budget: Budget;
};

export type Verdict = "one-app" | "modular" | "micro-frontends";

export type FitResult = {
  verdict: Verdict;
  approach: ApproachId | null;
  reasons: string[];
  warnings: string[];
};

export const DEFAULT_ANSWERS: FitAnswers = { teams: "many", blocking: "often", frameworks: "one", layout: "mixed", seo: true, budget: "normal" };

export function recommend(a: FitAnswers): FitResult {
  if (a.teams === "one") {
    return {
      verdict: "one-app",
      approach: null,
      reasons: [
        "One team has nobody else to release independently from, so micro frontends would add integration work and buy nothing.",
        a.frameworks === "migrating"
          ? "A migration with one team is usually faster route by route inside one app, or with a temporary proxy in front of the old one."
          : "Keep the code in clear feature folders so it can split later if more teams arrive.",
      ],
      warnings: [],
    };
  }

  if (a.blocking === "rarely" && a.frameworks === "one") {
    return {
      verdict: "modular",
      approach: null,
      reasons: [
        "Releases rarely block each other, so independent deploys solve a problem you don't have.",
        "Packages with enforced boundaries and owners give each team its own area, and one deploy keeps one copy of every library.",
        "Revisit when release conflicts become frequent; boundaries drawn now become the seams of a later split.",
      ],
      warnings: [],
    };
  }

  const reasons: string[] = [];
  const warnings: string[] = [];
  if (a.blocking !== "rarely") reasons.push(`Releases block each other ${a.blocking === "often" ? "often" : "now and then"}, and independent deploys remove the shared release train.`);
  if (a.teams === "many") reasons.push("With many teams, one deploy pipeline becomes the bottleneck and the blast radius of every bad merge.");
  if (a.frameworks === "migrating") reasons.push("A migration can replace the legacy app one route at a time while both keep running (the strangler pattern).");
  if (a.frameworks === "several") reasons.push("Teams on different frameworks can still ship one product, at the cost of loading more than one framework.");

  let approach: ApproachId;
  if (a.layout === "pages" || a.frameworks === "migrating") {
    approach = "route";
    reasons.push(
      a.layout === "pages"
        ? "Each team owns whole pages, so a route-level split (separate apps under one domain) gives independent releases with no runtime composition at all."
        : "Start with a route-level split around the legacy app; compose on one page only where a migrated piece must sit inside an old page.",
    );
  } else if (a.seo) {
    approach = a.teams === "many" ? "edge" : "server";
    reasons.push("Pieces share a page and search engines and first paint need the content in the HTML, so compose on the server or at the edge.");
  } else {
    approach = "client";
    reasons.push("Pieces share a page and the content doesn't need to be in the first HTML, so the browser can compose them at runtime.");
  }

  if (a.frameworks === "several") warnings.push("Every extra framework is loaded by every visitor of a page that uses it. Agree on one where you can.");
  if (a.budget === "tight" && (approach === "client" || a.frameworks === "several")) {
    warnings.push("With a tight budget, share the framework as a single copy and set a size budget per piece, or the page grows with every team.");
  }
  if (a.teams === "few" && a.blocking === "sometimes") warnings.push("With only a few teams and occasional conflicts, a modular monolith with a faster pipeline may be enough. Try that first.");

  return { verdict: "micro-frontends", approach, reasons, warnings };
}
