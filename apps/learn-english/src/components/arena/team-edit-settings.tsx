"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { TeamSettings } from "@/learning/arena/team-protocol";
import { sameTeamSettings, TeamSettingsFields, useTeamSettingsDraft } from "./team-settings-fields";

interface TeamEditSettingsProps {
  settings: TeamSettings;
  /** Players in the room now: the size can't go below it (AC-050). */
  minSize: number;
  onSave: (settings: TeamSettings) => void;
}

/** The form, mounted each time the dialog opens so it starts from the room's current settings. */
function TeamEditSettingsForm({ settings, minSize, onSave }: TeamEditSettingsProps) {
  const draft = useTeamSettingsDraft(settings);
  const next = draft.settings;

  function handleSave() {
    if (next) onSave(next);
  }

  return (
    <>
      <TeamSettingsFields draft={draft} minSize={minSize} />
      <DialogFooter>
        <Button size="lg" className="h-11 w-full sm:w-auto" disabled={!next} onClick={handleSave}>
          {draft.available === null ? "Đang tải câu hỏi…" : "Lưu cài đặt"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** "Đổi cài đặt" for a team room: the host changes the settings in the lobby (AC-049). */
export function TeamEditSettings({ settings, minSize, onSave }: TeamEditSettingsProps) {
  const [open, setOpen] = useState(false);

  function handleSave(next: TeamSettings) {
    if (!sameTeamSettings(next, settings)) onSave(next);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-11 gap-2" />}>
        <Settings2 aria-hidden /> Đổi cài đặt
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Đổi cài đặt</DialogTitle>
          <DialogDescription>Trận đấu dùng cài đặt mới. Số người không được ít hơn số người đang trong phòng.</DialogDescription>
        </DialogHeader>
        {open ? <TeamEditSettingsForm settings={settings} minSize={minSize} onSave={handleSave} /> : null}
      </DialogContent>
    </Dialog>
  );
}
