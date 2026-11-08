import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { mascotMood } from "@/components/lesson/streak-summary";
import { EmptyState } from "@/components/shell/load-states";
import { Mascot, type MascotMood } from "./mascot";

describe("the cat (030 AC-001, AC-002; placements from 021)", () => {
  it("draws each mood and is decoration unless labelled", () => {
    for (const mood of ["happy", "cheer", "think", "sleepy"] satisfies MascotMood[]) {
      const { container, unmount } = render(<Mascot mood={mood} size={64} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.dataset.mood).toBe(mood);
      expect(wrapper.style.width).toBe("64px");
      expect(wrapper.style.height).toBe("73.6px");
      expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });

  it("is an image with a name when labelled, holding its ENGLISH A·B·C book", () => {
    render(<Mascot label="Mèo đang vui" />);
    const cat = screen.getByRole("img", { name: "Mèo đang vui" });
    expect(cat).toHaveTextContent("ENGLISH");
    expect(cat).toHaveTextContent("A·B·C");
  });

  it("takes the place of the icon in an empty state with a mood (AC-003)", () => {
    const { container } = render(<EmptyState mood="cheer" title="Chưa có từ khó nào" />);
    expect(container.querySelector('[data-mood="cheer"]')).not.toBeNull();
    expect(screen.getByText("Chưa có từ khó nào")).toBeInTheDocument();
  });

  it("picks its mood from the streak (AC-005)", () => {
    expect(mascotMood(3, false)).toBe("sleepy");
    expect(mascotMood(3, true)).toBe("happy");
    expect(mascotMood(7, true)).toBe("cheer");
  });
});
