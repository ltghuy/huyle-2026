"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/account/account-avatar";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { CHALLENGE_MS, challengeKey, type LinkFrame } from "@/learning/arena/link";
import { link as defaultLink, type Link } from "@/lib/link-client";
import { SecondsLeft } from "./seconds-left";
import { settingsLine } from "./settings-fields";

// Keeps this tab's link open while signed in (feature 035) and shows a friend's
// challenge as a toast on any page, lessons included (AC-004). The toast closes on
// an answer, on the host's cancel or after 30 seconds, whichever comes first.

type ChallengeFrame = Extract<LinkFrame, { type: "challenge" }>;

interface ChallengeToastProps {
  challenge: ChallengeFrame;
  deadline: number;
  onAnswer: (accept: boolean) => void;
}

export function ChallengeToast({ challenge, deadline, onAnswer }: ChallengeToastProps) {
  return (
    <div role="alertdialog" aria-labelledby="challenge-title" className="grid w-[min(24rem,calc(100vw-2rem))] gap-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-center gap-3">
        <AccountAvatar name={challenge.from.name} image={challenge.from.image} className="size-10" />
        <div className="min-w-0 flex-1">
          <p id="challenge-title" className="flex items-center gap-1.5 font-semibold">
            <Swords aria-hidden className="size-4 shrink-0 text-primary" />
            <span className="truncate">{challenge.from.name} thách đấu bạn!</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {settingsLine(challenge.settings)} · <SecondsLeft deadline={deadline} />
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => onAnswer(false)}>
          Từ chối
        </Button>
        <Button className="h-11" onClick={() => onAnswer(true)}>
          Chấp nhận
        </Button>
      </div>
    </div>
  );
}

export function LinkRunner({ client = defaultLink }: { client?: Link }) {
  const { status } = useAccount();
  const router = useRouter();
  const signedIn = status === "signed-in";

  useEffect(() => {
    if (!signedIn) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    function close(key: string) {
      clearTimeout(timers.get(key));
      timers.delete(key);
      toast.dismiss(key);
    }

    function show(challenge: ChallengeFrame) {
      const key = challengeKey(challenge.from.id, challenge.code);
      const deadline = Date.now() + CHALLENGE_MS;
      function handleAnswer(accept: boolean) {
        close(key);
        client.answer(challenge.from.id, challenge.code, accept);
        // Joining is the room page's job, exactly as with a code (AC-005).
        if (accept) router.push(`/arena/room?code=${challenge.code}`);
      }
      clearTimeout(timers.get(key));
      // Sonner pauses its own timer on hover, so this one decides when the 30 seconds are up (AC-009).
      timers.set(key, setTimeout(() => close(key), CHALLENGE_MS));
      toast.custom(() => <ChallengeToast challenge={challenge} deadline={deadline} onAnswer={handleAnswer} />, { id: key, duration: Infinity, unstyled: true });
    }

    const unsubscribe = client.subscribe((frame) => {
      if (frame.type === "challenge") show(frame);
      else if (frame.type === "challenge-closed") close(challengeKey(frame.hostId, frame.code));
    });
    client.start();
    return () => {
      unsubscribe();
      client.stop();
      for (const key of [...timers.keys()]) close(key);
    };
  }, [signedIn, client, router]);

  return null;
}
