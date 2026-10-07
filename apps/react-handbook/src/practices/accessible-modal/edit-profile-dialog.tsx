"use client";

import { Pencil } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/practices/toast-notifications/toast-store";

import { DESTRUCTIVE_TEXT, Modal } from "./modal";

type Profile = { name: string; email: string; bio: string };
type Errors = Partial<Record<keyof Profile, string>>;

const SAVED: Profile = { name: "Alex Morgan", email: "alex@example.com", bio: "Product designer." };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ["name", "email", "bio"] as const;

function validate(profile: Profile): Errors {
  const errors: Errors = {};
  if (!profile.name.trim()) errors.name = "Enter your name.";
  else if (profile.name.length > 50) errors.name = "Use 50 characters or fewer.";
  if (!EMAIL.test(profile.email.trim())) errors.email = "Enter an email address like name@example.com.";
  if (profile.bio.length > 160) errors.bio = "Use 160 characters or fewer.";
  return errors;
}

export function EditProfileScenario() {
  const [saved, setSaved] = useState(SAVED);
  const [open, setOpen] = useState(false);
  const [openings, setOpenings] = useState(0);

  function handleOpen() {
    setOpenings((n) => n + 1);
    setOpen(true);
  }

  function handleSaved(profile: Profile) {
    setSaved(profile);
    setOpen(false);
    toast.success("Profile saved", { description: profile.name });
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-3">
        <dt className="text-foreground/75">Name</dt>
        <dd>{saved.name}</dd>
        <dt className="text-foreground/75">Email</dt>
        <dd className="truncate">{saved.email}</dd>
      </dl>
      <div>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Pencil aria-hidden /> Edit profile
        </Button>
      </div>
      {/* A new key per opening: the form starts from the saved profile, and
          closing keeps the same instance so it can animate out. */}
      <EditProfileDialog key={openings} open={open} saved={saved} onClose={() => setOpen(false)} onSaved={handleSaved} />
    </div>
  );
}

function EditProfileDialog({
  open, saved, onClose, onSaved,
}: {
  open: boolean;
  saved: Profile;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
}) {
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState<Errors>({});
  const [guardOpen, setGuardOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { form: useId(), name: useId(), email: useId(), bio: useId() };
  const dirty = FIELDS.some((field) => values[field] !== saved[field]);

  // Any dismissal with unsaved edits asks first.
  function handleRequestClose() {
    if (dirty) setGuardOpen(true);
    else onClose();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const field = event.target.name as keyof Profile;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate(values);
    setErrors(next);
    const firstInvalid = FIELDS.find((field) => next[field]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    onSaved({ name: values.name.trim(), email: values.email.trim(), bio: values.bio });
  }

  function handleDiscard() {
    setGuardOpen(false);
    onClose();
  }

  function fieldProps(field: keyof Profile, id: string) {
    return {
      id,
      name: field,
      value: values[field],
      onChange: handleChange,
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${id}-error` : undefined,
    };
  }

  return (
    <>
      <Modal
        open={open}
        title="Edit profile"
        description="Changes are saved when you press Save."
        onRequestClose={handleRequestClose}
        footer={
          <>
            <Button variant="outline" onClick={handleRequestClose}>
              Cancel
            </Button>
            <Button type="submit" form={ids.form}>
              Save
            </Button>
          </>
        }
      >
        <form ref={formRef} id={ids.form} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Name" id={ids.name} error={errors.name}>
            <Input {...fieldProps("name", ids.name)} autoComplete="name" />
          </Field>
          <Field label="Email" id={ids.email} error={errors.email}>
            <Input {...fieldProps("email", ids.email)} type="email" autoComplete="email" />
          </Field>
          <Field label="Bio" id={ids.bio} error={errors.bio}>
            <Textarea {...fieldProps("bio", ids.bio)} rows={3} />
          </Field>
        </form>
      </Modal>

      <Modal
        open={guardOpen}
        role="alertdialog"
        size="sm"
        title="Discard changes?"
        description="Your edits to the profile will be lost."
        showClose={false}
        onRequestClose={() => setGuardOpen(false)}
        footer={
          <>
            <Button variant="outline" data-autofocus onClick={() => setGuardOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleDiscard} className={DESTRUCTIVE_TEXT}>
              Discard
            </Button>
          </>
        }
      />
    </>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
