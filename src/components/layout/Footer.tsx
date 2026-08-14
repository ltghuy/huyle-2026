import type { ComponentType, SVGProps } from "react";
import { Mail } from "lucide-react";
import { profile } from "@/content/profile";
import { socials, type SocialLink } from "@/content/socials";
import {
  GithubIcon,
  LinkedinIcon,
  InstagramIcon,
  FacebookIcon,
} from "@/components/icons/BrandIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<SocialLink["icon"], IconComponent> = {
  mail: Mail,
  linkedin: LinkedinIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
};

export function Footer() {
  const year = 2026;

  return (
    <footer className="border-t border-line px-6 py-12 sm:px-12 lg:px-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <p className="text-sm text-fg-subtle">
          Designed &amp; built by{" "}
          <span className="text-fg-muted">{profile.display}</span> · {year}
        </p>

        <ul className="flex items-center gap-3">
          {socials.map((social) => {
            const Icon = ICONS[social.icon];
            return (
              <li key={social.label}>
                <a
                  href={social.href}
                  target={social.icon === "mail" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="grid size-9 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  <Icon className="size-4" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
