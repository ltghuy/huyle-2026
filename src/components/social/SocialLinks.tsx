import type { ComponentType, SVGProps } from "react";
import { Mail } from "lucide-react";
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

/** Profiles only — the email address gets its own dedicated CTA. */
const PROFILE_LINKS = socials.filter((s) => s.icon !== "mail");

interface SocialLinksProps {
  /** Links to render. Defaults to social profiles (email excluded). */
  links?: SocialLink[];
  /** Extra classes for the list container (e.g. `justify-center`). */
  className?: string;
}

/**
 * A row of social-profile icon buttons. Single source of truth for the
 * icon mapping and link markup shared across the site (Contact, etc.).
 */
export function SocialLinks({
  links = PROFILE_LINKS,
  className = "",
}: SocialLinksProps) {
  return (
    <ul className={`flex items-center gap-3 ${className}`.trim()}>
      {links.map((social) => {
        const Icon = ICONS[social.icon];
        const isExternal = social.icon !== "mail";
        return (
          <li key={social.label}>
            <a
              href={social.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              aria-label={social.label}
              title={social.label}
              className="grid size-11 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              <Icon className="size-4" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
