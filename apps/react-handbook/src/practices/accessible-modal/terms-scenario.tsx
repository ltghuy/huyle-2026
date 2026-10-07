"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";

import { Modal } from "./modal";

const SECTIONS = [
  ["Using the service", "You may use the playground to learn and experiment. Don't use it to store anything you'd mind losing: demo data lives in memory and resets when the server restarts."],
  ["Your content", "Anything you type stays in your browser or in this demo's mock server. Nothing is sent to third parties, and nothing is kept between sessions."],
  ["Acceptable use", "Don't try to break other people's sessions, overload the mock endpoints on purpose, or use the chat and upload practices to share content you don't have the rights to."],
  ["Availability", "The playground is provided as is. Practices may change, move or disappear as the curriculum evolves, and some demos deliberately fail to show error handling."],
  ["Accessibility", "Every practice aims to be usable with a keyboard and a screen reader. If something isn't, that's a bug worth reporting: it is exactly what these exercises are for."],
  ["Privacy", "The playground doesn't use analytics or cookies beyond what the framework needs. Your theme choice is stored in your browser's local storage."],
  ["Changes to these terms", "When these terms change, the date at the top changes too. Continuing to use the playground after a change means you accept the new terms."],
  ["Contact", "Questions about these terms can go to the playground's maintainers through the repository's issue tracker."],
] as const;

export function TermsScenario() {
  const [open, setOpen] = useState(false);

  function handleAccept() {
    setOpen(false);
    toast.success("Terms accepted");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground/75">A dialog taller than the screen: the body scrolls, the title and actions stay put.</p>
      <div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <FileText aria-hidden /> Read terms
        </Button>
      </div>
      <Modal
        open={open}
        size="lg"
        title="Terms of use"
        description="Last updated October 7, 2026."
        focusTitle
        bodyLabel="Terms text"
        onRequestClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Decline
            </Button>
            <Button onClick={handleAccept}>Accept</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 leading-relaxed">
          {SECTIONS.map(([heading, text], i) => (
            <section key={heading} className="flex flex-col gap-1">
              <h3 className="font-medium">
                {i + 1}. {heading}
              </h3>
              <p className="text-foreground/75">{text}</p>
              <p className="text-foreground/75">{text}</p>
            </section>
          ))}
        </div>
      </Modal>
    </div>
  );
}
