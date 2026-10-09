export type Stage = "style" | "layout" | "paint" | "composite";

export const STAGES: { id: Stage; title: string; detail: string }[] = [
  { id: "style", title: "Style", detail: "Work out which rules apply and the final values" },
  { id: "layout", title: "Layout", detail: "Compute every box's size and position" },
  { id: "paint", title: "Paint", detail: "Draw text, colors, borders and shadows into layers" },
  { id: "composite", title: "Composite", detail: "Combine the layers on the GPU, moved or faded" },
];

export type PropertyId = "left" | "width" | "background-color" | "box-shadow" | "transform" | "opacity";

type Ctx = { distance: number; from: string; to: string };

export const PROPERTIES: {
  id: PropertyId;
  label: string;
  short: string;
  stages: Stage[];
  keyframes: (ctx: Ctx) => Keyframe[];
}[] = [
  { id: "left", short: "left", label: "left (position)", stages: ["style", "layout", "paint", "composite"], keyframes: ({ distance }) => [{ left: "0px" }, { left: `${distance}px` }] },
  { id: "width", short: "width", label: "width", stages: ["style", "layout", "paint", "composite"], keyframes: ({ distance }) => [{ width: "3rem" }, { width: `calc(3rem + ${distance}px)` }] },
  { id: "background-color", short: "color", label: "background-color", stages: ["style", "paint", "composite"], keyframes: ({ from, to }) => [{ backgroundColor: from }, { backgroundColor: to }] },
  { id: "box-shadow", short: "shadow", label: "box-shadow", stages: ["style", "paint", "composite"], keyframes: ({ from }) => [{ boxShadow: `0 0 0 0 ${from}` }, { boxShadow: `0 0 0 1rem ${from}` }] },
  { id: "transform", short: "transform", label: "transform", stages: ["style", "composite"], keyframes: ({ distance }) => [{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }] },
  { id: "opacity", short: "opacity", label: "opacity", stages: ["style", "composite"], keyframes: () => [{ opacity: 1 }, { opacity: 0.15 }] },
];

export const ANIMATION: KeyframeAnimationOptions = { duration: 1000, iterations: Infinity, direction: "alternate", easing: "ease-in-out" };

/** Keeps the main thread busy for `ms`, the way a heavy script would. */
export function busyWait(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // spin
  }
}
