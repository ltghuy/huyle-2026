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
import { findTarget, TOUR_STEPS } from "./tour-steps";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [targets, setTargets] = useState<(HTMLElement | null)[]>([]);

  const ready = profile.status === "ready" ? profile.data : null;
  const replay = searchParams.get("tour") === "1";
  const firstVisit = Boolean(ready && !ready.tourSeen && ready.placement !== "pending");
  const welcomeOpen = phase === "idle" && pathname === "/" && firstVisit && !replay;

  useEffect(() => {
    if (!replay || pathname !== "/" || phase === "touring") return;
    // Next frame: the page has laid out, so the tour can find its targets.
    const frame = requestAnimationFrame(startTour);
    return () => cancelAnimationFrame(frame);
    // startTour only reads the DOM and sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, pathname, phase]);

  useEffect(() => {
    if (phase !== "touring") return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setStep((current) => Math.min(current + 1, TOUR_STEPS.length - 1));
      if (event.key === "ArrowLeft") setStep((current) => Math.max(current - 1, 0));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase]);

  function markSeen() {
    void updateProfile({ tourSeen: true }, Date.now());
  }

  function startTour() {
    // Seen as soon as it starts: closing the browser mid-tour must not force it again.
    markSeen();
    setTargets(TOUR_STEPS.map((def) => findTarget(def.target)));
    setStep(0);
    setPhase("touring");
    if (replay) router.replace("/");
  }

  function handleSkipWelcome() {
    markSeen();
    setPhase("done");
  }

  function handleTourOpenChange(open: boolean) {
    if (!open) setPhase("done");
  }

  function handleNext(event: React.MouseEvent) {
    if (step === TOUR_STEPS.length - 1) {
      event.preventDefault();
      setPhase("done");
    }
  }

  return (
    <>
      <AlertDialog open={welcomeOpen} onOpenChange={(open) => !open && handleSkipWelcome()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <Compass className="size-10 text-primary" aria-hidden />
            <AlertDialogTitle>Chào mừng bạn đến với Học tiếng Anh!</AlertDialogTitle>
            <AlertDialogDescription>
              Mỗi ngày bạn có một bài học ngắn gồm ôn tập, từ mới, ngữ pháp và luyện câu. Ứng dụng nhắc bạn ôn lại đúng lúc sắp quên, gom
              những từ khó để luyện riêng, và cộng điểm chuyên cần mỗi ngày bạn học. Mình đi một vòng xem các phần chính nhé?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bỏ qua</AlertDialogCancel>
            <AlertDialogAction onClick={startTour}>Xem hướng dẫn</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tour
        open={phase === "touring"}
        onOpenChange={handleTourOpenChange}
        value={step}
        onValueChange={setStep}
        onComplete={() => setPhase("done")}
        onSkip={() => setPhase("done")}
        spotlightPadding={6}
      >
        <TourPortal>
          <TourSpotlight />
          <TourSpotlightRing className="rounded-lg" />
          {TOUR_STEPS.map((def, i) => {
            const target = targets[i];
            return (
              <TourStep
                key={def.target}
                // No visible target (hidden menu on a phone): show the step as a centred card.
                target={target ?? "body"}
                forceMount={!target}
                side="right"
                align="start"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`tour-title-${i}`}
                aria-describedby={`tour-desc-${i}`}
                className={target ? undefined : "top-1/2! left-1/2! -translate-x-1/2 -translate-y-1/2"}
              >
                {target ? <TourArrow /> : null}
                <TourHeader>
                  <TourTitle id={`tour-title-${i}`}>{def.title}</TourTitle>
                  <TourDescription id={`tour-desc-${i}`}>{def.description}</TourDescription>
                </TourHeader>
                <TourFooter>
                  <TourStepCounter format={(current, total) => `${current}/${total}`} className="mr-auto self-center" />
                  <TourPrev aria-label="Bước trước" variant="outline" disabled={i === 0}>
                    Trước
                  </TourPrev>
                  <TourNext aria-label={i === TOUR_STEPS.length - 1 ? "Kết thúc hướng dẫn" : "Bước tiếp theo"} onClick={handleNext}>
                    {i === TOUR_STEPS.length - 1 ? "Xong" : "Tiếp"}
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
