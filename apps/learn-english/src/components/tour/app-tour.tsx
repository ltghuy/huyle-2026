"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { updateProfile } from "@/storage/meta";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tour,
  TourArrow,
  TourClose,
  TourDescription,
  TourFooter,
  TourHeader,
  TourNext,
  TourPortal,
  TourPrev,
  TourSpotlight,
  TourSpotlightRing,
  TourStep,
  TourStepCounter,
  TourTitle,
} from "@/components/ui/tour";
import { useProfile } from "@/hooks/use-profile";
import { canUseLockedAreas, useAccount } from "@/hooks/use-account";
import { learnerName } from "@/lib/learner-name";
import { findTarget, sideFor, stepDescription, stepTitle, tourSteps, type TourSide, type TourStepDef } from "./tour-steps";

interface Placement {
  target: HTMLElement | null;
  side: TourSide;
}

function placements(steps: TourStepDef[]): Placement[] {
  return steps.map((def) => {
    const target = findTarget(def.target);
    return { target, side: sideFor(target) };
  });
}

/**
 * Resolves once the first step's target and the lesson card are on the page (the card, or the guest's
 * sign-in prompt in its place, renders after storage and the session load), or after ~2 s.
 */
function whenTargetsReady(first: string, callback: () => void): () => void {
  let tries = 0;
  let timer = 0;
  const check = () => {
    if ((findTarget(first) && findTarget("lesson-card")) || tries++ >= 20) callback();
    else timer = window.setTimeout(check, 100);
  };
  check();
  return () => window.clearTimeout(timer);
}

type Phase = "idle" | "touring" | "done";

/**
 * First-visit welcome dialog and guided tour (AC-038–AC-041). Shown once per
 * browser on the home page after placement, and again via `/?tour=1`.
 */
export function AppTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profile = useProfile();
  const { status, account } = useAccount();
  const guest = !canUseLockedAreas(status);
  const steps = tourSteps(guest);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  // Measured once when the tour starts. The tour registers a step again, at the end of its list,
  // whenever its target or side changes; when only some changed, the order broke and no step matched
  // the current one, so the tour showed nothing (seen for guests in feature 022). Steps therefore
  // render only once measured and keep their props; the targets are live elements, so the cards
  // still follow them as the page moves.
  const [targets, setTargets] = useState<Placement[]>([]);

  const ready = profile.status === "ready" ? profile.data : null;
  const replay = searchParams.get("tour") === "1";
  // After the name prompt (feature 003), so the two dialogs never stack.
  const name = learnerName(ready?.displayName, account?.name);
  const firstVisit = Boolean(name && !ready?.tourSeen && ready?.placement !== "pending");
  const welcomeOpen = phase === "idle" && pathname === "/" && firstVisit && !replay;

  useEffect(() => {
    if (!replay || pathname !== "/" || phase === "touring") return;
    return whenTargetsReady(steps[0].target, startTour);
    // startTour only reads the DOM and sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, pathname, phase]);

  useEffect(() => {
    if (phase !== "touring") return;
    // Arrow keys press the step's own buttons: setting the tour's value from
    // outside doesn't re-render its steps (Dice UI's controlled mode).
    function handleKey(event: KeyboardEvent) {
      const slot = event.key === "ArrowRight" ? "tour-next" : event.key === "ArrowLeft" ? "tour-prev" : null;
      if (!slot) return;
      const button = document.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]:not(:disabled)`);
      if (button && !(slot === "tour-next" && step === steps.length - 1)) button.click();
    }
    // Capture phase: focused dialog primitives stop arrow keys from bubbling.
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [phase, step, steps.length]);

  function markSeen() {
    void updateProfile({ tourSeen: true }, Date.now());
  }

  function startTour() {
    // Seen as soon as it starts: closing the browser mid-tour must not force it again.
    markSeen();
    setTargets(placements(steps));
    setStep(0);
    setPhase("touring");
    if (replay) router.replace("/");
  }

  function handleSkipWelcome() {
    markSeen();
    setPhase("done");
  }

  /** Ends the tour; the steps unmount, so a replay measures and registers them afresh. */
  function finish() {
    setPhase("done");
    setTargets([]);
  }

  function handleTourOpenChange(open: boolean) {
    if (!open) finish();
  }

  function handleStepChange(next: number) {
    setStep(next);
  }

  function handleWelcomeStart() {
    whenTargetsReady(steps[0].target, startTour);
  }

  function handleNext(event: React.MouseEvent) {
    if (step === steps.length - 1) {
      event.preventDefault();
      finish();
    }
  }

  return (
    <>
      <AlertDialog open={welcomeOpen} onOpenChange={(open) => !open && handleSkipWelcome()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <Compass className="size-10 text-primary" aria-hidden />
            <AlertDialogTitle>Chào mừng {name ?? "bạn"} đến với Streak Daily!</AlertDialogTitle>
            <AlertDialogDescription>
              {guest
                ? "Bạn tra và học từ vựng ngay được. Đăng nhập bằng Google để có bài học ngắn mỗi ngày, lịch ôn tập nhắc đúng lúc sắp quên, ngữ pháp, bài tập và chuỗi ngày học. Mình đi một vòng xem các phần chính nhé?"
                : "Mỗi ngày bạn có một bài học ngắn gồm ôn tập, từ mới, ngữ pháp và luyện câu. Ứng dụng nhắc bạn ôn lại đúng lúc sắp quên, gom những từ khó để luyện riêng, và cộng điểm chuyên cần mỗi ngày bạn học. Mình đi một vòng xem các phần chính nhé?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bỏ qua</AlertDialogCancel>
            <AlertDialogAction onClick={handleWelcomeStart}>Xem hướng dẫn</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tour
        open={phase === "touring"}
        onOpenChange={handleTourOpenChange}
        value={step}
        onValueChange={handleStepChange}
        onComplete={finish}
        onSkip={finish}
        spotlightPadding={6}
      >
        <TourPortal>
          <TourSpotlight />
          <TourSpotlightRing className="rounded-lg" />
          {targets.length !== steps.length ? null : steps.map((def, i) => {
            const target = targets[i]?.target ?? null;
            return (
              <TourStep
                key={def.target}
                // No visible target (hidden menu on a phone): show the step as a centred card.
                target={target ?? "body"}
                forceMount={!target}
                side={targets[i]?.side ?? "bottom"}
                align={targets[i]?.side === "right" ? "start" : "center"}
                collisionPadding={12}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`tour-title-${i}`}
                aria-describedby={`tour-desc-${i}`}
                className={target ? undefined : "top-1/2! left-1/2! -translate-x-1/2 -translate-y-1/2"}
              >
                {target ? <TourArrow /> : null}
                <TourHeader>
                  <TourTitle id={`tour-title-${i}`}>{stepTitle(def, guest)}</TourTitle>
                  <TourDescription id={`tour-desc-${i}`}>{stepDescription(def, guest)}</TourDescription>
                </TourHeader>
                <TourFooter>
                  <TourStepCounter format={(current, total) => `${current}/${total}`} className="mr-auto self-center" />
                  <TourPrev aria-label="Bước trước" variant="outline" disabled={i === 0}>
                    Trước
                  </TourPrev>
                  <TourNext aria-label={i === steps.length - 1 ? "Kết thúc hướng dẫn" : "Bước tiếp theo"} onClick={handleNext}>
                    {i === steps.length - 1 ? "Xong" : "Tiếp"}
                  </TourNext>
                </TourFooter>
                <TourClose aria-label="Đóng hướng dẫn" />
              </TourStep>
            );
          })}
        </TourPortal>
      </Tour>
    </>
  );
}
