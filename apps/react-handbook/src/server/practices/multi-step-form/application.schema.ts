// Shared by the wizard and the server (no `server-only`): the steps, the
// rules for every step, which steps apply, and the cross-step rule. The
// browser checks a step with the same schema the server uses on submit, so
// the two can only disagree on server-only rules (email already used).
//
// Schemas take the form's own shape (strings, booleans, string arrays) and
// output parsed data. Rules about months depend on "today", which is passed
// in, so they're deterministic and testable.

import { z } from "zod";

// -- steps -----------------------------------------------------------------------

export const STEP_IDS = ["personal", "role", "experience", "engineering", "design", "authorization", "extras", "review"] as const;
export type StepId = (typeof STEP_IDS)[number];

export function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && (STEP_IDS as readonly string[]).includes(value);
}

// -- options ---------------------------------------------------------------------

function options<const T extends string>(labels: Record<T, string>) {
  return { values: Object.keys(labels) as [T, ...T[]], labels };
}

export const COUNTRIES = options({
  au: "Australia",
  br: "Brazil",
  ca: "Canada",
  de: "Germany",
  fr: "France",
  in: "India",
  jp: "Japan",
  kr: "South Korea",
  nl: "Netherlands",
  gb: "United Kingdom",
  us: "United States",
  vn: "Vietnam",
});

export const ROLES = options({ engineering: "Engineering", design: "Design", sales: "Sales" });
export const EMPLOYMENT = options({ "full-time": "Full-time", "part-time": "Part-time", contract: "Contract" });
export const YES_NO = options({ yes: "Yes", no: "No" });
export const LANGUAGES = options({
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  cpp: "C++",
});
export const DESIGN_TOOLS = options({
  figma: "Figma",
  sketch: "Sketch",
  framer: "Framer",
  illustrator: "Illustrator",
  photoshop: "Photoshop",
  protopie: "ProtoPie",
});
export const AUTH_STATUS = options({
  "citizen-elsewhere": "Citizen of another country",
  "student-visa": "Student visa",
  "work-visa": "Work visa for another employer",
  other: "Other",
});
export const SOURCES = options({ referral: "A referral", "job-board": "A job board", social: "Social media", event: "An event", other: "Somewhere else" });

export const MAX_ENTRIES = 5;
export const MAX_LANGUAGES = 5;
export const COVER_LETTER = { min: 100, max: 2000 };
export const SALARY = { min: 10_000, max: 1_000_000 };

// -- form values -------------------------------------------------------------------

export type ExperienceEntry = {
  id: string;
  company: string;
  title: string;
  startMonth: string;
  endMonth: string;
  current: boolean;
};

/** What the form holds: every input as typed, for every step (applicable or not). */
export type ApplicationValues = {
  personal: { fullName: string; email: string; phone: string; country: string };
  role: { role: string; employment: string; startMonth: string; needsSponsorship: string };
  experience: { none: boolean; entries: ExperienceEntry[] };
  engineering: { languages: string[]; years: string; profileUrl: string };
  design: { portfolioUrl: string; tools: string[] };
  authorization: { residence: string; status: string; earliestMonth: string };
  extras: { coverLetter: string; salaryMin: string; salaryMax: string; source: string };
  review: { consent: boolean };
};

export function emptyEntry(id: string): ExperienceEntry {
  return { id, company: "", title: "", startMonth: "", endMonth: "", current: false };
}

export const EMPTY_VALUES: ApplicationValues = {
  personal: { fullName: "", email: "", phone: "", country: "" },
  role: { role: "", employment: "", startMonth: "", needsSponsorship: "" },
  experience: { none: false, entries: [] },
  engineering: { languages: [], years: "", profileUrl: "" },
  design: { portfolioUrl: "", tools: [] },
  authorization: { residence: "", status: "", earliestMonth: "" },
  extras: { coverLetter: "", salaryMin: "", salaryMax: "", source: "" },
  review: { consent: false },
};

/** Steps that apply to these answers, in order. Works on untrusted input too. */
export function applicableStepIds(values: { role?: unknown }): StepId[] {
  const role = (typeof values.role === "object" && values.role ? values.role : {}) as Record<string, unknown>;
  return STEP_IDS.filter((id) => {
    if (id === "engineering") return role.role === "engineering";
    if (id === "design") return role.role === "design";
    if (id === "authorization") return role.needsSponsorship === "yes";
    return true;
  });
}

// -- months ----------------------------------------------------------------------

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10" for a date (local time). */
export function monthOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Months since year 0, or null when the value isn't a full "YYYY-MM". */
export function monthIndex(value: string) {
  const match = MONTH_RE.exec(value);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

export function addMonths(month: string, count: number) {
  const index = monthIndex(month);
  if (index === null) return month;
  const next = index + count;
  return `${Math.floor(next / 12)}-${String((next % 12) + 1).padStart(2, "0")}`;
}

/** "Oct 2026"; returns the input when it isn't a month. */
export function formatMonth(value: string) {
  const index = monthIndex(value);
  return index === null ? value : `${MONTH_NAMES[index % 12]} ${Math.floor(index / 12)}`;
}

/** A full "YYYY-MM"; later checks only run once the format is right. */
function month(message: string) {
  return z.string().regex(MONTH_RE, { message, abort: true });
}

/** A month between `from` and `to` months after today (inclusive). */
function monthWithin(today: string, from: number, to: number, label: string) {
  const min = addMonths(today, from);
  const max = addMonths(today, to);
  return month(`Choose the month and year ${label}`).refine(
    (v) => monthIndex(v)! >= monthIndex(min)! && monthIndex(v)! <= monthIndex(max)!,
    `Choose a month from ${formatMonth(min)} to ${formatMonth(max)}`,
  );
}

// -- rules -----------------------------------------------------------------------

const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

function required(label: string) {
  return z.string().trim().min(1, `Enter ${label}`);
}

function choice<T extends string>(values: [T, ...T[]], message: string) {
  return z.enum(values, { error: message });
}

function httpsUrl(message: string) {
  return z
    .string()
    .trim()
    .max(300, "Links can be at most 300 characters")
    .refine((v) => {
      try {
        const url = new URL(v);
        return url.protocol === "https:" && url.hostname.includes(".");
      } catch {
        return false;
      }
    }, message);
}

function wholeNumber(message: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, { message, abort: true })
    .transform(Number)
    .refine((n) => n >= min && n <= max, message);
}

function entrySchema(today: string) {
  return z
    .strictObject({
      id: z.string().min(1).max(40),
      company: required("the company name").max(80, "Company names can be at most 80 characters"),
      title: required("your job title").max(80, "Job titles can be at most 80 characters"),
      startMonth: month("Choose the start month and year").refine(
        (v) => monthIndex(v)! <= monthIndex(today)!,
        "The start month can't be in the future",
      ),
      endMonth: z.string().max(7),
      current: z.boolean(),
    })
    .superRefine((entry, ctx) => {
      if (entry.current) return;
      const end = monthIndex(entry.endMonth);
      const start = monthIndex(entry.startMonth);
      if (end === null) {
        ctx.addIssue({ code: "custom", path: ["endMonth"], message: "Choose the end month and year, or tick “I work here now”" });
      } else if (end > monthIndex(today)!) {
        ctx.addIssue({ code: "custom", path: ["endMonth"], message: "The end month can't be in the future" });
      } else if (start !== null && end < start) {
        ctx.addIssue({ code: "custom", path: ["endMonth"], message: "The end month can't be before the start month" });
      }
    })
    .transform((entry) => ({ ...entry, endMonth: entry.current ? null : entry.endMonth }));
}

/** One schema per step, for a given "today" ("YYYY-MM"). */
export function stepSchemas(today: string) {
  const entry = entrySchema(today);
  return {
    personal: z.strictObject({
      fullName: required("your full name")
        .min(2, "Your full name must be at least 2 characters")
        .max(80, "Your full name can be at most 80 characters"),
      email: required("your email address")
        .max(254, "Email addresses can be at most 254 characters")
        .pipe(z.email("Enter an email address like name@example.com")),
      phone: z
        .string()
        .trim()
        .max(20, "Phone numbers can be at most 20 characters")
        .refine((v) => v === "" || PHONE_RE.test(v), "Enter a phone number using digits, spaces and + ( ) -, 7 to 20 characters"),
      country: choice(COUNTRIES.values, "Choose the country you live in"),
    }),
    role: z.strictObject({
      role: choice(ROLES.values, "Choose the role you're applying for"),
      employment: choice(EMPLOYMENT.values, "Choose the type of employment"),
      startMonth: monthWithin(today, 0, 6, "you'd like to start"),
      needsSponsorship: choice(YES_NO.values, "Tell us whether you need visa sponsorship"),
    }),
    experience: z
      .strictObject({
        none: z.boolean(),
        entries: z.array(z.unknown()).max(MAX_ENTRIES, `Add at most ${MAX_ENTRIES} jobs`),
      })
      .superRefine((value, ctx) => {
        if (value.none) return;
        if (value.entries.length === 0) {
          ctx.addIssue({ code: "custom", path: ["entries"], message: "Add at least one job, or tick “I don't have work experience yet”" });
        }
        value.entries.forEach((raw, i) => {
          const result = entry.safeParse(raw);
          if (result.success) return;
          for (const issue of result.error.issues) {
            if (issue.code === "unrecognized_keys") {
              for (const key of issue.keys) ctx.addIssue({ code: "custom", path: ["entries", i, key], message: `“${key}” isn't a field of a job` });
            } else {
              ctx.addIssue({ code: "custom", path: ["entries", i, ...issue.path], message: issue.message });
            }
          }
        });
      })
      .transform((value) => ({ none: value.none, entries: value.none ? [] : value.entries.map((e) => entry.parse(e)) })),
    engineering: z.strictObject({
      languages: z
        .array(choice(LANGUAGES.values, "Choose languages from the list"))
        .min(1, "Choose at least one language")
        .max(MAX_LANGUAGES, `Choose at most ${MAX_LANGUAGES} languages`),
      years: wholeNumber("Enter your years of experience as a whole number from 0 to 50", 0, 50),
      profileUrl: z.union([z.literal(""), httpsUrl("Enter a full link starting with https://, or leave it empty")]),
    }),
    design: z.strictObject({
      portfolioUrl: httpsUrl("Enter your portfolio link, starting with https://"),
      tools: z.array(choice(DESIGN_TOOLS.values, "Choose tools from the list")).min(1, "Choose at least one tool"),
    }),
    authorization: z.strictObject({
      residence: choice(COUNTRIES.values, "Choose the country you live in now"),
      status: choice(AUTH_STATUS.values, "Choose your current status"),
      earliestMonth: monthWithin(today, 0, 12, "you could legally start"),
    }),
    extras: z
      .strictObject({
        coverLetter: z
          .string()
          .trim()
          .min(COVER_LETTER.min, `Write at least ${COVER_LETTER.min} characters`)
          .max(COVER_LETTER.max, `Keep it to ${COVER_LETTER.max} characters or fewer`),
        salaryMin: wholeNumber(`Enter a yearly amount from ${SALARY.min.toLocaleString("en-US")} to ${SALARY.max.toLocaleString("en-US")}`, SALARY.min, SALARY.max),
        salaryMax: wholeNumber(`Enter a yearly amount from ${SALARY.min.toLocaleString("en-US")} to ${SALARY.max.toLocaleString("en-US")}`, SALARY.min, SALARY.max),
        source: z.union([z.literal(""), choice(SOURCES.values, "Choose an option from the list")]),
      })
      .superRefine((value, ctx) => {
        if (value.salaryMax < value.salaryMin) {
          ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "The maximum can't be less than the minimum" });
        }
      }),
    review: z.strictObject({
      consent: z.literal(true, { error: "Confirm that your answers are accurate" }),
    }),
  } satisfies Record<StepId, z.ZodType>;
}

export type StepSchemas = ReturnType<typeof stepSchemas>;
export type ApplicationData = { [K in StepId]?: z.output<StepSchemas[K]> };

// -- validation --------------------------------------------------------------------

/** One problem: the step it belongs to, the field path (e.g. "experience.entries.0.endMonth") and a message. */
export type FieldIssue = { step: StepId | null; path: string; message: string };

function toPath(step: string, path: readonly PropertyKey[]) {
  return [step, ...path.map(String)].join(".");
}

/** Zod issues as field issues; an unknown key is reported on the key itself. */
function issuesOf(step: StepId, error: z.ZodError): FieldIssue[] {
  return error.issues.flatMap((issue) =>
    issue.code === "unrecognized_keys"
      ? issue.keys.map((key) => ({ step, path: toPath(step, [...issue.path, key]), message: `“${key}” isn't a field of this step` }))
      : [{ step, path: toPath(step, issue.path), message: issue.message }],
  );
}

/**
 * Rules that span steps: the start date chosen on Role can't be before the
 * earliest legal start on Work authorization. Reported on the later step.
 */
export function crossStepIssues(values: { role?: unknown; authorization?: unknown }): FieldIssue[] {
  if (!applicableStepIds(values).includes("authorization")) return [];
  const start = monthIndex(String((values.role as Record<string, unknown> | undefined)?.startMonth ?? ""));
  const earliest = monthIndex(String((values.authorization as Record<string, unknown> | undefined)?.earliestMonth ?? ""));
  if (start === null || earliest === null || start >= earliest) return [];
  const startMonth = String((values.role as Record<string, unknown>).startMonth);
  return [
    {
      step: "authorization",
      path: "authorization.earliestMonth",
      message: `You chose to start in ${formatMonth(startMonth)} on the Role step, before you could legally start. Choose an earlier month here, or a later start date on Role.`,
    },
  ];
}

/** Problems on one step, including cross-step rules reported on it. */
export function validateStep(step: StepId, values: ApplicationValues, today: string): FieldIssue[] {
  const result = stepSchemas(today)[step].safeParse(values[step]);
  const issues = result.success ? [] : issuesOf(step, result.error);
  return [...issues, ...crossStepIssues(values).filter((i) => i.step === step)];
}

export type ValidationResult = { ok: true; data: ApplicationData } | { ok: false; issues: FieldIssue[] };

/**
 * The whole application, as the server sees it: untrusted input, every
 * applicable step required, steps that don't apply rejected, unknown keys
 * rejected. The browser runs it before submitting too.
 */
export function validateApplication(body: unknown, today: string): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, issues: [{ step: null, path: "", message: "The application must be an object" }] };
  }
  const input = body as Record<string, unknown>;
  const schemas = stepSchemas(today);
  const applicable = applicableStepIds(input);
  const issues: FieldIssue[] = [];
  const data: ApplicationData = {};

  for (const key of Object.keys(input)) {
    if (!isStepId(key)) issues.push({ step: null, path: key, message: `“${key}” isn't part of the application` });
    else if (!applicable.includes(key)) issues.push({ step: key, path: key, message: "This step doesn't apply to your answers and must not be sent" });
  }
  for (const step of applicable) {
    if (!(step in input)) {
      issues.push({ step, path: step, message: "This step is missing" });
      continue;
    }
    const result = schemas[step].safeParse(input[step]);
    if (result.success) (data as Record<string, unknown>)[step] = result.data;
    else issues.push(...issuesOf(step, result.error));
  }
  issues.push(...crossStepIssues(input));
  return issues.length > 0 ? { ok: false, issues } : { ok: true, data };
}

// -- API ---------------------------------------------------------------------------

export const OUTCOMES = options({
  accept: "Accept",
  "reject-field": "Reject a field",
  "email-taken": "Email already used",
  "server-error": "Server error",
});
export type Outcome = (typeof OUTCOMES.values)[number];

const latencyMs = z.coerce.number().int().min(0).max(10_000).default(0);

export const emailCheckQuerySchema = z.object({ latencyMs });
export const emailCheckBodySchema = z.object({ email: stepSchemas("2000-01").personal.shape.email });
export const applicationsQuerySchema = z.object({ latencyMs, outcome: z.enum(OUTCOMES.values).default("accept") });

export type EmailCheck = { available: boolean; message?: string };
export type Submission = { applicationId: string; submittedAt: string; summary: { fullName: string; email: string; role: string } };

/** Emails the mock server already has applications for. */
export const USED_EMAILS = ["taken@example.com", "used@example.com"];
export const EMAIL_TAKEN = "An application with this email already exists";

// -- samples -----------------------------------------------------------------------

/** Valid answers for every step (Engineering, needs sponsorship), relative to today. */
export function sampleValues(today: string): ApplicationValues {
  return {
    personal: { fullName: "Alex Morgan", email: "alex.morgan@example.com", phone: "+1 415 555 0100", country: "ca" },
    role: { role: "engineering", employment: "full-time", startMonth: addMonths(today, 3), needsSponsorship: "yes" },
    experience: {
      none: false,
      entries: [
        { id: "sample-1", company: "Northwind Labs", title: "Frontend Engineer", startMonth: addMonths(today, -30), endMonth: "", current: true },
        { id: "sample-2", company: "Contoso", title: "Junior Developer", startMonth: addMonths(today, -60), endMonth: addMonths(today, -31), current: false },
      ],
    },
    engineering: { languages: ["typescript", "go"], years: "5", profileUrl: "https://github.com/alexmorgan" },
    design: { portfolioUrl: "", tools: [] },
    authorization: { residence: "ca", status: "citizen-elsewhere", earliestMonth: addMonths(today, 2) },
    extras: {
      coverLetter:
        "I build accessible, fast interfaces and enjoy the details of forms: validation timing, focus, and error messages people can act on. I'd love to bring that care to your product team.",
      salaryMin: "90000",
      salaryMax: "120000",
      source: "referral",
    },
    review: { consent: true },
  };
}
