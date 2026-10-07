"use client";

import { ChevronRight, Settings } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";

import { DESTRUCTIVE_TEXT, Modal } from "./modal";
import { confirm } from "./modal-store";

async function resetEverything(close: () => void) {
  const confirmed = await confirm({
    title: "Reset all settings?",
    description: "Notifications, privacy and advanced options go back to their defaults.",
    confirmLabel: "Reset",
    destructive: true,
  });
  if (!confirmed) return;
  close();
  toast.success("Settings reset");
}

/** Three levels: Settings → Advanced → "Reset all settings?" */
export function SettingsScenario() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const ids = { email: useId(), digest: useId(), beta: useId(), telemetry: useId() };

  function handleReset() {
    void resetEverything(() => setAdvancedOpen(false));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground/75">Each level opens from the one below; Escape closes one level at a time.</p>
      <div>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings aria-hidden /> Open settings
        </Button>
      </div>

      <Modal
        open={settingsOpen}
        title="Settings"
        description="Level 1 of 3."
        onRequestClose={() => setSettingsOpen(false)}
        footer={<Button onClick={() => setSettingsOpen(false)}>Done</Button>}
      >
        <div className="flex flex-col gap-3">
          <Check id={ids.email} label="Email notifications" defaultChecked />
          <Check id={ids.digest} label="Weekly digest" />
          <Button variant="outline" className="justify-between" onClick={() => setAdvancedOpen(true)}>
            Advanced… <ChevronRight aria-hidden />
          </Button>
        </div>
      </Modal>

      <Modal
        open={advancedOpen}
        title="Advanced settings"
        description="Level 2 of 3."
        onRequestClose={() => setAdvancedOpen(false)}
        footer={<Button onClick={() => setAdvancedOpen(false)}>Back</Button>}
      >
        <div className="flex flex-col gap-3">
          <Check id={ids.beta} label="Try beta features" />
          <Check id={ids.telemetry} label="Share usage data" defaultChecked />
          <Button variant="destructive" onClick={handleReset} className={DESTRUCTIVE_TEXT}>
            Reset all settings…
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Check({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <label htmlFor={id} className="flex min-h-8 items-center gap-2">
      <input id={id} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-primary" />
      {label}
    </label>
  );
}
