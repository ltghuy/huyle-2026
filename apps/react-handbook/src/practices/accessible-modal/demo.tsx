"use client";

import { useId } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";

import { EditProfileScenario } from "./edit-profile-dialog";
import { EventLog } from "./event-log";
import { modalStore, useModalSettings, type ModalLayout } from "./modal-store";
import { NativeConfirm } from "./native-confirm";
import { ProjectsScenario } from "./projects-scenario";
import { SettingsScenario } from "./settings-scenario";
import { TermsScenario } from "./terms-scenario";

const LAYOUTS: { value: ModalLayout; label: string }[] = [
  { value: "auto", label: "Auto (sheet on phones)" },
  { value: "dialog", label: "Centered dialog" },
  { value: "sheet", label: "Bottom sheet" },
];

const SCENARIOS = [
  { title: "Confirm before deleting", text: "An alert dialog from confirm(): focus starts on Cancel, the backdrop is ignored, and focus moves to the next row after a delete.", Scenario: ProjectsScenario },
  { title: "Edit without losing work", text: "Closing with unsaved edits asks first, in a dialog on top of the form.", Scenario: EditProfileScenario },
  { title: "Stacked dialogs", text: "", Scenario: SettingsScenario },
  { title: "Long content", text: "", Scenario: TermsScenario },
  { title: "Native <dialog> comparison", text: "", Scenario: NativeConfirm },
];

function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex h-8 items-center gap-2 text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
      {label}
    </label>
  );
}

export function Demo() {
  const settings = useModalSettings();
  const ids = { backdrop: useId(), animations: useId(), layout: useId() };

  return (
    <>
      <DemoControls>
        <Check id={ids.backdrop} label="Backdrop click closes" checked={settings.backdropCloses} onChange={(v) => modalStore.setSettings({ backdropCloses: v })} />
        <Check id={ids.animations} label="Animations" checked={settings.animations} onChange={(v) => modalStore.setSettings({ animations: v })} />
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.layout} className="text-xs font-medium text-muted-foreground">
            Layout
          </label>
          <select
            id={ids.layout}
            value={settings.layout}
            onChange={(e) => modalStore.setSettings({ layout: e.target.value as ModalLayout })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {LAYOUTS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            {SCENARIOS.map(({ title, text, Scenario }) => (
              <section key={title} aria-label={title} className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
                <h3 className="font-medium">{title}</h3>
                {text ? <p className="text-foreground/75">{text}</p> : null}
                <Scenario />
              </section>
            ))}
          </div>
          <EventLog />
        </div>
      </DemoStage>
    </>
  );
}
