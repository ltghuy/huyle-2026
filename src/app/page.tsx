import { Hero } from "@/components/hero/Hero";
import { Statement } from "@/components/sections/Statement";
import { Gallery } from "@/components/sections/Gallery.client";
import { WhatIDo } from "@/components/sections/WhatIDo";
import { Experience } from "@/components/sections/Experience";
import { Work } from "@/components/sections/Work";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Statement />
      <Gallery />
      <WhatIDo />
      <Experience />
      <Work />
      <Contact />
    </main>
  );
}
