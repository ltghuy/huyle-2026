import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { letterMask } from "@/learning/arena/questions";
import { LetterInput } from "./letter-input";

function Harness({ answer, checked = true }: { answer: string; checked?: boolean }) {
  const [value, setValue] = useState("");
  return <LetterInput aria-label="Từ tiếng Anh" mask={letterMask(answer)} answer={checked ? answer : undefined} value={value} onChange={setValue} />;
}

function tiles(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>("[data-slot='tile']")];
}

function type(value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Từ tiếng Anh" }), { target: { value } });
}

describe("LetterInput", () => {
  it("starts with one empty tile per letter", () => {
    const { container } = render(<Harness answer="companion" />);
    expect(tiles(container)).toHaveLength(9);
    expect(tiles(container).every((tile) => tile.dataset.state === "empty")).toBe(true);
  });

  it("shows each typed letter green when it is right in its slot and red when it is not", () => {
    const { container } = render(<Harness answer="companion" />);
    type("cx");
    const [first, second, third] = tiles(container);
    expect(first).toHaveTextContent("c");
    expect(first.dataset.verdict).toBe("right");
    expect(first).toHaveClass("text-success");
    expect(second).toHaveTextContent("x");
    expect(second.dataset.verdict).toBe("wrong");
    expect(second).toHaveClass("text-destructive");
    expect(third.dataset.state).toBe("empty");
  });

  it("ignores case and keeps the word's marks fixed", () => {
    const { container } = render(<Harness answer="ice-cream" />);
    expect(tiles(container)).toHaveLength(8);
    type("ICEcr");
    expect(tiles(container).map((tile) => tile.dataset.verdict)).toEqual(["right", "right", "right", "right", "right", undefined, undefined, undefined]);
  });

  it("folds Telex letters back before checking them", () => {
    const { container } = render(<Harness answer="book" />);
    type("bôk");
    expect(tiles(container).map((tile) => tile.dataset.verdict)).toEqual(["right", "right", "right", "right"]);
    expect(screen.getByRole("status")).toHaveTextContent("Telex");
  });

  it("takes no more letters than there are tiles", () => {
    render(<Harness answer="cat" />);
    type("cat");
    type("cats");
    expect(screen.getByRole("textbox", { name: "Từ tiếng Anh" })).toHaveValue("cat");
  });

  it("takes focus as the question opens", () => {
    render(<Harness answer="life" />);
    expect(screen.getByRole("textbox", { name: "Từ tiếng Anh" })).toHaveFocus();
  });

  it("only fills the tiles when it is not given the word (the Arena)", () => {
    const { container } = render(<Harness answer="life" checked={false} />);
    type("lx");
    expect(tiles(container).map((tile) => tile.dataset.state)).toEqual(["filled", "filled", "empty", "empty"]);
    expect(tiles(container).some((tile) => tile.dataset.verdict)).toBe(false);
  });
});
