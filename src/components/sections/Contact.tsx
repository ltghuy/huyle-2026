import type { ComponentType, SVGProps } from "react";
import { Mail } from "lucide-react";
import { socials, type SocialLink } from "@/content/socials";
import {
  GithubIcon,
  LinkedinIcon,
  InstagramIcon,
  FacebookIcon,
} from "@/components/icons/BrandIcons";
import { Reveal } from "@/components/motion/Reveal";
import { MagneticLink } from "@/components/motion/MagneticLink";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<SocialLink["icon"], IconComponent> = {
  mail: Mail,
  linkedin: LinkedinIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
};

export function Contact() {
  const email = socials.find((s) => s.icon === "mail");

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-6 py-32 sm:px-12 lg:px-20"
    >
      <div
        aria-hidden
        className="glow-blob bottom-[-10%] right-[-5%] h-[40rem] w-[40rem] opacity-50"
      />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="eyebrow mb-4">Get in touch</p>
          <h2 className="display text-5xl text-fg sm:text-7xl lg:text-8xl">
            Let&apos;s talk
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-fg-muted sm:text-lg">
            Have a role, a project, or just want to say hi? My inbox is open.
          </p>
        </Reveal>

        {email && (
          <Reveal className="mt-10">
            <MagneticLink
              href={email.href}
              strength={0.3}
              className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-4 text-lg font-medium text-on-accent shadow-glow-accent transition-colors duration-200 hover:bg-accent-bright"
            >
              <Mail className="size-5" />
              {email.value}
            </MagneticLink>
          </Reveal>
        )}

        <Reveal className="mt-12 flex items-center justify-center gap-3">
          {socials
            .filter((s) => s.icon !== "mail")
            .map((social) => {
              const Icon = ICONS[social.icon];
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="grid size-11 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
        </Reveal>
      </div>
    </section>
  );
}
