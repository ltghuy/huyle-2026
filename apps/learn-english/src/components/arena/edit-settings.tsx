"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ArenaSettings } from "@/learning/arena/protocol";
import { sameSettings, SettingsFields, useSettingsDraft } from "./settings-fields";

interface EditSettingsProps {
  settings: ArenaSettings;
  onSave: (settings: ArenaSettings) => void;
}

/** The form, mounted each time the dialog opens so it starts from the room's current settings. */
function EditSettingsForm({ settings, onSave }: EditSettingsProps) {
  const draft = useSettingsDraft(settings);
  const next = draft.settings;

  function handleSave() {
    if (next) onSave(next);
  }

  return (
    <>
      <SettingsFields draft={draft} />
      <DialogFooter>
        <Button size="lg" className="h-11 w-full sm:w-auto" disabled={!next} onClick={handleSave}>
          {draft.available === null ? "Đang tải câu hỏi…" : "Lưu cài đặt"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** "Đổi cài đặt": the room creator changes mode, level or rounds before the next match (AC-031). */
export function EditSettings({ settings, onSave }: EditSettingsProps) {
  const [open, setOpen] = useState(false);

  function handleSave(next: ArenaSettings) {
    if (!sameSettings(next, settings)) onSave(next);
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
          <DialogDescription>Trận tiếp theo dùng cài đặt mới. Cả hai cần bấm Sẵn sàng lại.</DialogDescription>
        </DialogHeader>
        {open ? <EditSettingsForm settings={settings} onSave={handleSave} /> : null}
      </DialogContent>
    </Dialog>
  );
}
