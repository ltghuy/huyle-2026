import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

import { SectionIcon } from "@/components/playground/section-icon";
import { Signature } from "@/components/playground/signature";
import { Progress } from "@/components/ui/progress";
import { sectionProgress, sections, SITE_NAME, type Section } from "@/practices/catalog";

const WHY = [
  "Tutorials stop at the happy path. Real frontend work starts when the network is slow, the list has 100,000 rows, the user is on a keyboard, or the token has just expired.",
  "The knowledge behind those cases is spread across MDN, web.dev, RFCs and blog posts. This handbook pulls it together, next to code that uses it.",
  "Building each piece from scratch, then writing down why it works, is the fastest way to really understand it, and leaves a reference worth coming back to.",
];

const BENEFITS = [
  { title: "Working code, not snippets", text: "Each practice is a complete feature with its own API route, built without a library doing the hard part." },
  { title: "Failure on purpose", text: "Demo controls add latency, errors and load, so you see the loading, empty, error and retry states, not just the happy path." },
  { title: "The why behind each choice", text: "Guides spell out the approach, best practices, what to avoid and the trade-offs, so you can defend the design." },
  { title: "The platform under React", text: "Networking, rendering, Core Web Vitals, accessibility, security, system design and the build tools behind it all, each with an interactive demo." },
];

const BUILT_WITH = [
  { label: "Framework", text: "Next.js 16 App Router on React 19. Pages are Server Components; client code lives only in the interactive leaves." },
  { label: "Backend", text: "Every demo talks to real route handlers under /api in the same repo. Input is validated with Zod and logic sits in server-only services." },
  { label: "UI", text: "Tailwind CSS v4 and shadcn/ui on Base UI primitives, lucide icons, and theme tokens so light and dark mode both work." },
  { label: "Process", text: "Spec-driven: each feature starts as a spec with acceptance criteria, then design, tasks, implementation and verification against those criteria." },
  { label: "Hosting", text: "Deployed to Cloudflare Workers with the OpenNext adapter." },
];

const REFERENCES = [
  {
    group: "React and Next.js",
    links: [
      { label: "react.dev", href: "https://react.dev/learn" },
      { label: "Next.js docs", href: "https://nextjs.org/docs" },
      { label: "shadcn/ui", href: "https://ui.shadcn.com" },
    ],
  },
  {
    group: "Browser and performance",
    links: [
      { label: "MDN Web Docs", href: "https://developer.mozilla.org/en-US/docs/Web" },
      { label: "web.dev: Learn Performance", href: "https://web.dev/learn/performance" },
      { label: "RenderingNG architecture", href: "https://developer.chrome.com/docs/chromium/renderingng-architecture" },
    ],
  },
  {
    group: "Accessibility and security",
    links: [
      { label: "web.dev: Learn Accessibility", href: "https://web.dev/learn/accessibility" },
      { label: "WAI-ARIA Authoring Practices", href: "https://www.w3.org/WAI/ARIA/apg/" },
      { label: "OWASP Cheat Sheet Series", href: "https://cheatsheetseries.owasp.org/" },
      { label: "RFC 7519: JSON Web Token", href: "https://www.rfc-editor.org/rfc/rfc7519" },
    ],
  },
  {
    group: "System design",
    links: [{ label: "GreatFrontEnd system design playbook", href: "https://www.greatfrontend.com/front-end-system-design-playbook" }],
  },
  {
    group: "Build tools",
    links: [
      { label: "webpack concepts", href: "https://webpack.js.org/concepts/" },
      { label: "Vite guide", href: "https://vite.dev/guide/" },
      { label: "Turbopack", href: "https://nextjs.org/docs/app/api-reference/turbopack" },
    ],
  },
];

const HOW_TO = [
  { title: "Build it", text: "Each practice is a classic frontend problem built from scratch, with a live demo and controls that break it on purpose." },
  { title: "Explain it", text: "Every page has a guide: the key ideas, how it was built, best practices and trade-offs behind each choice." },
  { title: "Stretch it", text: "The other sections cover what sits around the code: the browser, performance, accessibility, system design, and the build tools under it." },
];

function ExternalAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function SectionCard({ section }: { section: Section }) {
  const progress = sectionProgress(section.id);
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <SectionIcon id={section.id} className="size-4" />
        </span>
        {section.href ? null : <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">Coming soon</span>}
      </div>
      <h3 className="font-medium">{section.title}</h3>
      <p className="text-sm text-muted-foreground">{section.summary}</p>
      {section.href && progress ? (
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Progress value={(progress.done / progress.total) * 100} aria-label={`${progress.done} of ${progress.total} ${progress.noun}`} />
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              <span className="font-mono font-medium text-foreground tabular-nums">
                {progress.done} of {progress.total}
              </span>{" "}
              {progress.noun}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              Open <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </p>
        </div>
      ) : null}
    </>
  );

  return section.href ? (
    <Link
      href={section.href}
      className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {body}
    </Link>
  ) : (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-dashed p-5">{body}</div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Notes and builds for senior frontend engineers</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{SITE_NAME}</h1>
        <p className="max-w-2xl text-muted-foreground">
          A working notebook for frontend engineering: classic UI problems built from scratch, plus the browser, performance,
          accessibility, security and system design knowledge around them. Every page pairs short notes with a live demo you can break on
          purpose. Start with the React Practices, then move on to the other handbooks.
        </p>
      </header>

      <section aria-labelledby="why-heading" className="flex flex-col gap-4">
        <h2 id="why-heading" className="text-lg font-semibold">
          Why it exists
        </h2>
        <div className="flex max-w-3xl flex-col gap-3 text-sm leading-relaxed text-foreground/85">
          {WHY.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="benefits-heading" className="flex flex-col gap-4">
        <h2 id="benefits-heading" className="text-lg font-semibold">
          What you get
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex flex-col gap-1 rounded-xl border p-4">
              <span className="font-medium">{benefit.title}</span>
              <span className="text-sm text-muted-foreground">{benefit.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-lg font-semibold">
          How to use it
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {HOW_TO.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-1 rounded-xl border p-4">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-medium">{step.title}</span>
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sections-heading" className="flex flex-col gap-4">
        <h2 id="sections-heading" className="text-lg font-semibold">
          Sections
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <SectionCard section={section} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="built-heading" className="flex flex-col gap-4">
        <h2 id="built-heading" className="text-lg font-semibold">
          How this site is built
        </h2>
        <dl className="grid max-w-3xl gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
          {BUILT_WITH.map((item) => (
            <div key={item.label} className="contents">
              <dt className="font-medium">{item.label}</dt>
              <dd className="text-muted-foreground">{item.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="references-heading" className="flex flex-col gap-4">
        <h2 id="references-heading" className="text-lg font-semibold">
          References
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">The sources these pages lean on most. Each topic page links to the specific articles it draws from.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          {REFERENCES.map((reference) => (
            <div key={reference.group} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">{reference.group}</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {reference.links.map((link) => (
                  <li key={link.href}>
                    <ExternalAnchor href={link.href}>{link.label}</ExternalAnchor>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Signature />
    </div>
  );
}
