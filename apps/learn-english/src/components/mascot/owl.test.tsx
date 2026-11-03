import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { owlMood } from "@/components/lesson/streak-summary";
import { EmptyState } from "@/components/shell/load-states";
import { Owl, type OwlMood } from "./owl";

describe("the owl (021 AC-001, AC-002)", () => {
  it("draws each mood and is decoration unless labelled", () => {
    for (const mood of ["happy", "cheer", "think", "sleepy"] satisfies OwlMood[]) {
      const { container, unmount } = render(<Owl mood={mood} size={64} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.dataset.mood).toBe(mood);
      expect(wrapper.style.width).toBe("64px");
      expect(wrapper.style.height).toBe("73.6px");
      expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });

  it("is an image with a name when labelled, holding its ENGLISH A·B·C book", () => {
    render(<Owl label="Cú đang vui" />);
    const owl = screen.getByRole("img", { name: "Cú đang vui" });
    expect(owl).toHaveTextContent("ENGLISH");
    expect(owl).toHaveTextContent("A·B·C");
  });

  it("takes the place of the icon in an empty state with a mood (AC-003)", () => {
    const { container } = render(<EmptyState mood="cheer" title="Chưa có từ khó nào" />);
    expect(container.querySelector('[data-mood="cheer"]')).not.toBeNull();
    expect(screen.getByText("Chưa có từ khó nào")).toBeInTheDocument();
  });

  it("picks its mood from the streak (AC-005)", () => {
    expect(owlMood(3, false)).toBe("sleepy");
    expect(owlMood(3, true)).toBe("happy");
    expect(owlMood(7, true)).toBe("cheer");
  });
});
