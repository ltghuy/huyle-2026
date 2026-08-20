import { Mail } from "lucide-react";
import { socials } from "@/content/socials";
import { SocialLinks } from "@/components/social/SocialLinks";
import { Reveal } from "@/components/motion/Reveal";
import { MagneticLink } from "@/components/motion/MagneticLink";

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

        <Reveal className="mt-12">
          <SocialLinks className="justify-center" />
        </Reveal>
      </div>
    </section>
  );
}
