import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { homeLd, JsonLd } from "./json-ld";
import { SITE_URL } from "./site";

describe("JSON-LD", () => {
  it("escapes < so a value can't close the script tag", () => {
    const { container } = render(<JsonLd data={{ name: "</script><b>x</b>" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).not.toContain("</script>");
    expect(JSON.parse(script?.textContent ?? "")).toEqual({ name: "</script><b>x</b>" });
  });

  it("describes the site and the free course on the home page", () => {
    const graph = homeLd()["@graph"] as Array<Record<string, unknown>>;
    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "Course"]);
    expect(graph[1]).toMatchObject({ url: SITE_URL, isAccessibleForFree: true, inLanguage: "vi" });
  });
});
