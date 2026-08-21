import type { ComponentType, SVGProps } from "react";
import { ArrowUpRight } from "lucide-react";
import { socials, type SocialLink } from "@/content/socials";
import { Reveal } from "@/components/motion/Reveal";
import { EmailActions } from "./EmailActions.client";
import {
  GithubIcon,
  LinkedinIcon,
  InstagramIcon,
  FacebookIcon,
} from "@/components/icons/BrandIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Brand mark per social profile (email is handled by the dedicated CTA). */
const CHANNEL_ICONS: Partial<Record<SocialLink["icon"], IconComponent>> = {
  linkedin: LinkedinIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
};

const CHANNELS = socials.filter((s) => s.icon !== "mail");

export function Contact() {
  const email = socials.find((s) => s.icon === "mail");

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-6 py-32 sm:px-12 lg:px-20"
    >
      {/* Ambient depth — two offset glows so the CTA doesn't float in a void. */}
      <div
        aria-hidden
        className="glow-blob bottom-[-10%] right-[-5%] h-[40rem] w-[40rem] opacity-50"
      />
      <div
        aria-hidden
        className="glow-blob left-[-12%] top-[8%] h-[26rem] w-[26rem] opacity-25"
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <Reveal>
          {/* Availability signal — echoes the "my inbox is open" copy below. */}
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-3 py-1 font-mono text-xs uppercase tracking-widest text-fg-muted backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            Open to opportunities
          </span>

          <p className="eyebrow mb-4 mt-6">Get in touch</p>
          <h2 className="display text-5xl text-fg sm:text-7xl lg:text-8xl">
            Let&apos;s talk
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-fg-muted sm:text-lg">
            Have a role, a project, or just want to talk shop over coffee? My
            inbox is open — and I actually reply.
          </p>
        </Reveal>

        {email && (
          <Reveal className="mt-10">
            <EmailActions href={email.href} value={email.value ?? ""} />
          </Reveal>
        )}

        <Reveal className="mt-16">
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-fg-subtle">
            Find me elsewhere
          </p>
          <ul className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {CHANNELS.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.icon];
              return (
                <li key={channel.label}>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${channel.label}${channel.value ? ` — ${channel.value}` : ""}`}
                    className="group flex h-full flex-col items-center gap-2 rounded-xl border border-line bg-surface/40 px-4 py-5 text-center transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-accent hover:bg-surface-raised/60"
                  >
                    <span className="grid size-10 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-200 group-hover:border-accent group-hover:text-accent">
                      {Icon && <Icon className="size-4" aria-hidden />}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-fg">
                      {channel.label}
                      <ArrowUpRight
                        aria-hidden
                        className="size-3.5 text-fg-subtle transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </span>
                    {channel.value && (
                      <span className="font-mono text-xs text-fg-subtle">
                        {channel.value}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
