export interface SocialLink {
  label: string;
  href: string;
  /** Lucide icon name */
  icon: "mail" | "linkedin" | "github" | "instagram" | "facebook";
  /** Handle/value shown in the UI where relevant */
  value?: string;
}

/**
 * Contact + social channels. Phone number is intentionally omitted (privacy
 * decision, 2026-08-11) — contact is email + social profiles only.
 */
export const socials: SocialLink[] = [
  {
    label: "Email",
    href: "mailto:letrangiahuy0507@gmail.com",
    icon: "mail",
    value: "letrangiahuy0507@gmail.com",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/ltghuy/",
    icon: "linkedin",
    value: "in/ltghuy",
  },
  {
    label: "GitHub",
    href: "https://github.com/ltghuy",
    icon: "github",
    value: "ltghuy",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/_ltghuy/",
    icon: "instagram",
    value: "_ltghuy",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/letranxgiahuy",
    icon: "facebook",
    value: "letranxgiahuy",
  },
];
