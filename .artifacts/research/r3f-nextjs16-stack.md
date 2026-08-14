# Research: react-three-fiber + Next.js 16 3D portfolio stack

- **Date:** 2026-08-11
- **Scope:** Technical-stack research for a 3D interactive portfolio (client-only WebGL, GLB characters, scroll-driven staging, graceful degradation) built on the versions installed in this repo.
- **Status:** Research only — no application code written.

## Installed versions (verified)

Read from local `package.json` and `node_modules/*/package.json`:

| Package | Version |
|---|---|
| `next` | 16.3.0 |
| `react` | 19.2.8 |
| `react-dom` | 19.2.8 |
| `tailwindcss` | ^4 (via `@tailwindcss/postcss`) |
| `typescript` | ^5 |

Package manager: `yarn@1.22.22`. Import alias `@/*` -> `src/*`. App Router (`src/app`).

Sources: `/Users/evan.letrangiahuy/Documents/Personal/evan-le/package.json`, `/Users/evan.letrangiahuy/Documents/Personal/evan-le/node_modules/next/package.json`, `/Users/evan.letrangiahuy/Documents/Personal/evan-le/node_modules/react/package.json`.

---

## 1. Client-only 3D rendering in App Router

**Recommendation:** Put `<Canvas>` in a component and load it via `next/dynamic(() => import('./Scene'), { ssr: false })` **from inside a Client Component** (a file with `"use client"`). `next/dynamic` with `{ ssr: false }` is still supported in Next 16, but **only in Client Components** — using it in a Server Component throws an error. So make a thin `"use client"` wrapper that does the dynamic import, and render that wrapper from your Server Component page.

Recommended shape:

```
// src/components/three/SceneClient.tsx
"use client";
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <PosterFallback />, // static image while chunk + WebGL boot
});
export default function SceneClient() { return <Scene />; }

// src/app/page.tsx  (Server Component — no "use client")
import SceneClient from "@/components/three/SceneClient";
export default function Page() { return <SceneClient />; }
```

Key rules confirmed from the Next 16 local doc (`.../02-guides/lazy-loading.md`):

- Verbatim from the doc: *"`ssr: false` option is not supported in Server Components. You will see an error if you try to use it in Server Components. `ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component."* This is the same restriction that landed in Next 15 and it **still applies in Next 16** — so the Next-15 assumption holds; verified against local docs.
- Verbatim: *"`ssr: false` option will only work for Client Components, move it into Client Components ensure the client code-splitting working properly."*
- The dynamic import path must be a literal string inside the `dynamic()` call (no variables/template strings) so the bundler can match and preload the chunk.
- `React.lazy()` + `<Suspense>` is the other supported option, but it prerenders (SSRs) the Client Component by default, which is exactly what we must avoid for WebGL — so `next/dynamic` with `ssr:false` is the cleaner fit for `<Canvas>`.

**App Router gotchas:**
- Any component using r3f hooks (`useThree`, `useFrame`, `useGLTF`) or the `<Canvas>` itself must live under a `"use client"` boundary; these hooks touch `window`/WebGL and cannot run on the server.
- Do not add `ssr:false` in the `page.tsx` (Server Component) directly — wrap it as shown.
- `dynamic()` must be called at module top level, not inside render.

Sources: `/Users/evan.letrangiahuy/Documents/Personal/evan-le/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (lines 60–95); server/client split guide `.../01-getting-started/05-server-and-client-components.md`.

---

## 2. Recommended library set + install command (yarn)

**Recommendation:** Use r3f v9 + drei v10 (both are the React 19 compatible line), `three` latest, GSAP (now fully free, includes ScrollTrigger + ScrambleTextPlugin) for DOM/scroll motion and the text scramble, and `motion` (the current package name for Framer Motion) for React layout/enter animations. Prefer **drei `ScrollControls`** for tying camera/scene staging to scroll inside the Canvas, and **GSAP `ScrollTrigger`** for DOM section reveals — don't run two competing scroll engines on the same scroll if avoidable.

Confirmed current, React-19 / Next-16 compatible packages:

- `three` — latest (r17x line). Peer of r3f.
- `@react-three/fiber` — **v9.x** (latest 9.7.0). v9 is the compatibility release for React 19; official statement: compatible with all React versions **19.0–19.2**. Note: when React bumped to 19.2, the internal reconciler version changed incompatibly, so r3f v9 now **bundles the reconciler**. Installed React here is **19.2.8**, which is in the 19.2.x range — use the newest r3f v9 (>= 9.7.0) which carries the 19.2 fix. (UNVERIFIED for the exact 19.2.8 patch — reasoning: docs state "19.0–19.2" as a range and 19.7.0 shipped the 19.2 reconciler bundling; pin to the latest 9.x and smoke-test, don't assume an older 9.x works with 19.2.)
- `@react-three/drei` — **v10.x** (latest 10.7.x). v10 is the line that pairs with r3f v9 / React 19. Provides `useGLTF`, `useAnimations`, `ScrollControls`, `Environment`, `Preload`, `AdaptiveDpr`, `Bvh`, `PerformanceMonitor`, etc.
- `gsap` — **100% free since April 2025** (Webflow acquired GreenSock). All formerly-paid Club plugins — including **ScrambleTextPlugin**, ScrollTrigger, ScrollSmoother, SplitText, MorphSVG — are now free (incl. commercial use) and published to public npm. So the scramble/decode text effect can use `ScrambleTextPlugin` directly; a lightweight hand-rolled requestAnimationFrame scrambler is a fine dependency-free alternative if you want to avoid loading GSAP just for that.
- `motion` — the current npm package for Framer Motion (rebranded; import from `motion/react`). Use for DOM/React entrance and micro-interactions. Optional if GSAP already covers motion needs.

**Suggested install (yarn):**

```bash
yarn add three @react-three/fiber @react-three/drei gsap
# optional DOM motion:
yarn add motion
# types for three:
yarn add -D @types/three
```

**React 19 peer-dep notes / how to resolve:**
- r3f v9 and drei v10 declare React 19 peers, so a clean `yarn add` should not fight React 19.2.8. If a transitive dep still pins React 18 and yarn errors, add a Yarn 1 `resolutions` block in `package.json`, e.g. `"resolutions": { "react": "19.2.8", "react-dom": "19.2.8" }`, or install with `--ignore-engines` only as a last resort.
- Do **not** downgrade to r3f v8 / drei v9 — those target React 18 and will misbehave on React 19.
- UNVERIFIED: exact latest `three` version number at install time — reasoning: three ships frequently; `yarn add three` resolves the current release, and r3f v9's `three` peer is a wide range, so take latest.

Sources: [@react-three/fiber npm](https://www.npmjs.com/package/@react-three/fiber), [pmndrs/react-three-fiber CHANGELOG](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/CHANGELOG.md), [v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide), [drei React 19 discussion #2213](https://github.com/pmndrs/drei/discussions/2213), [@react-three/drei npm](https://www.npmjs.com/package/@react-three/drei), [Webflow: GSAP is 100% free](https://webflow.com/blog/gsap-becomes-free), [CSS-Tricks: GSAP now free](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/).

---

## 3. Loading GLB models + performance

**Recommendation:** Load rigged GLBs with drei `useGLTF` inside a `<Suspense>` boundary, drive animations with `useAnimations`, preload with `useGLTF.preload(url)` / drei `<Preload all />`, and ship Draco- or meshopt-compressed GLBs. Clamp `dpr`, use on-demand `frameloop`, lazy-mount the Canvas, and show a poster until the scene is interactive. Put static GLBs in `public/`.

Loading + animation pattern:
- `const { scene, animations } = useGLTF('/assets/models/hero.glb')` then `const { actions } = useAnimations(animations, groupRef)`; play/crossfade actions in an effect. Wrap the model component in `<Suspense fallback={...}>` so the Canvas can render while the GLB streams in.
- Preload: call `useGLTF.preload('/assets/models/hero.glb')` at module scope, and/or add drei `<Preload all />` inside the Canvas to warm GPU uploads. This avoids a stall on first reveal.
- Compression: prefer **meshopt** or **Draco**. drei's `useGLTF` auto-wires the Draco decoder (accepts a decoder path) and supports meshopt via three's `MeshoptDecoder`. Compress at export time with `gltf-transform` (Draco/meshopt) or `gltfpack`. Note: the local `meshyai` skill's `optimize-glb.mjs` already applies **meshopt** compression + 1024px WebP textures and reduces GLBs ~80–95%; those optimized GLBs require `MeshoptDecoder` at runtime.

Keeping payload small + smooth FPS:
- **dpr clamping:** `<Canvas dpr={[1, 2]} />` (cap at 2, or 1.5 on mobile). Add drei `<AdaptiveDpr pixelated />` to drop resolution under load.
- **On-demand render:** `<Canvas frameloop="demand" />` so the scene only renders on change/interaction (great for a mostly-static hero); switch to `"always"` only while an animation/scroll is active. `invalidate()` triggers a frame when needed.
- **Lazy-mount the Canvas:** dynamic import with `ssr:false` (topic 1) keeps ~three+r3f JS out of the initial bundle; optionally mount only when the hero scrolls into view (IntersectionObserver) to defer WebGL init.
- **Poster fallback:** render a static image (screenshot of the scene) as the `loading` fallback and behind the Canvas so first paint is instant and there's a graceful state if WebGL is slow/unavailable.
- Other: use `<Bvh>` for raycast-heavy scenes, drei `<PerformanceMonitor>` to adaptively scale quality, keep polycount/texture sizes modest (mirrors the meshyai 1024px/meshopt defaults), reuse a single Canvas.

**Where 3D assets live:** In `public/` — Next serves anything in `public` from the base URL `/`. Convention (matching the meshyai skill) is `public/assets/models/*.glb`, referenced as `/assets/models/hero.glb`. Note the default `Cache-Control: public, max-age=0` on `public` assets; for large GLBs consider a hashed filename + CDN/long-cache header at deploy if load time matters.

Sources: `/Users/evan.letrangiahuy/Documents/Personal/evan-le/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md`; drei docs (`useGLTF`, `useAnimations`, `Preload`, `AdaptiveDpr`, `PerformanceMonitor`) — https://drei.docs.pmnd.rs/ ; r3f performance docs — https://r3f.docs.pmnd.rs/advanced/scaling-performance ; local `meshyai` skill `SKILL.md` (optimize-glb / meshopt notes).

---

## 4. Graceful degradation

**Recommendation:** Feature-detect WebGL before mounting the Canvas and fall back to a static poster on failure; gate all non-essential motion behind `prefers-reduced-motion`; and on mobile lower `dpr` / simplify the scene or serve the poster outright.

- **WebGL detection:** attempt to get a context — create a `<canvas>` and call `getContext('webgl2') || getContext('webgl')`; if null (or it throws), render the poster instead of the Canvas. Also handle runtime loss via the Canvas `onError` path / the canvas `webglcontextlost` event, swapping to the poster. drei's `<Canvas fallback={...}>` prop renders fallback content when WebGL can't initialize.
- **`prefers-reduced-motion`:** read `window.matchMedia('(prefers-reduced-motion: reduce)')` (and subscribe to changes). When reduced: skip autoplay animations/scroll-driven camera moves, present the poster or a single static pose, and disable the scramble-text loop (render final text immediately). This is an accessibility requirement, not a nicety.
- **Mobile:** detect coarse pointer / small viewport / low `deviceMemory`; then lower `dpr` (cap ~1.5), reduce lights/shadows/post-processing, or serve the poster + a lighter interaction. Defer Canvas mount until in view to protect INP/LCP. Provide the poster as the LCP image so mobile first paint isn't blocked on WebGL.

Sources: MDN WebGL context detection — https://developer.mozilla.org/docs/Web/API/WebGL_API/By_example/Detect_WebGL ; MDN `prefers-reduced-motion` — https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion ; drei `Canvas`/`fallback` — https://r3f.docs.pmnd.rs/ . (UNVERIFIED: exact drei prop name for the WebGL-failure fallback across v10 minor versions — reasoning: r3f `<Canvas>` exposes a `fallback`/error path but the prop surface shifts between minors; confirm against installed drei/r3f types before use. The manual `getContext` guard above works regardless.)

---

## 5. Meshy AI pipeline (high level)

**Recommendation:** Generate the character with the local `meshyai` skill's `scripts/meshy-generate.mjs`; for a rigged/animated humanoid, chain **image-to-3D -> rig -> animate** and let the script auto-optimize and write GLBs into `public/assets/models/`.

Pipeline shape (from the `meshyai` skill):
1. **Image-to-3D** (or text-to-3D) — `--mode image-to-3d --image ./photo.png --slug hero` produces a textured GLB. (Preview = geometry only; refine = textured. Rigging needs the textured mesh.)
2. **Auto-rig** (humanoids, mandatory) — `--mode rig --task-id <id> --height 1.8 --slug hero` adds a skeleton and **auto-downloads walk + run animation GLBs**. Output: `hero.glb` (rigged) + `hero-walk.glb` + `hero-run.glb`.
3. **Animate** — `--mode animate --task-id <rig-id> --action-id N --slug hero-<clip>` applies additional named clips.
4. **Optimize (automatic)** — every downloaded GLB runs through `optimize-glb.mjs`: 1024px WebP textures + **meshopt** compression, ~80–95% smaller. Consumers must load `MeshoptDecoder` at runtime (drei/three supports this).

**Outputs/formats to expect:** GLB (`.glb`) files plus a `.meta.json` (task IDs for traceability). Rigged models carry a skeleton + animation clips; integrate via SkeletonUtils clone (drei `useGLTF`/`useAnimations` handle this). **Caveats:** rig only works on textured **bipedal humanoid** meshes; Meshy retains remote assets for **only ~3 days**, so download immediately and keep the GLB in `public/`. Requires `MESHY_API_KEY` (present in `.env`).

Sources: `/Users/evan.letrangiahuy/.agents/skills/meshyai/SKILL.md`; companion `api-reference.md`, `rigging-pipeline.md`, `verification-patterns.md` in the same skill dir.

---

## 6. Fonts (Next 16 `next/font/google`, self-hosted, CSS variables)

**Recommendation:** Keep the existing `next/font/google` pattern from `layout.tsx` — call each font as a function with a `variable` CSS-var name and `subsets: ['latin']`, then apply all `variable` classNames on `<html>`. Space Grotesk, Inter, and JetBrains Mono are all Google variable fonts, so no `weight` is required. These are self-hosted automatically (no request to Google at runtime), zero layout shift.

Pattern (mirrors the current `Geist({ variable })` usage, extended):

```tsx
// src/app/layout.tsx
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const inter        = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrainsMono= JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
```

Notes:
- Multi-word Google font names use underscores in the import (`Space_Grotesk`, `JetBrains_Mono`).
- `variable` exposes a CSS custom property; wire it into Tailwind v4 via `@theme` (e.g. `--font-sans: var(--font-inter)`) or use the vars directly in `globals.css`. Variable fonts need no `weight`; a non-variable font would require `weight`.
- `display: 'swap'` is the recommended default; `preload` defaults on for fonts with `subsets`.
- Existing `layout.tsx` already uses `LayoutProps<"/">` (Next 16 typed layout props) — keep that.

Sources: `/Users/evan.letrangiahuy/Documents/Personal/evan-le/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`; `/Users/evan.letrangiahuy/Documents/Personal/evan-le/node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` (options table incl. `variable`, `subsets`, `display`, `weight`); existing `/Users/evan.letrangiahuy/Documents/Personal/evan-le/src/app/layout.tsx`.

---

## Open items / to verify at implementation time

- Exact latest `three` version and the exact r3f 9.x patch that is clean against React **19.2.8** — install latest and smoke-test a trivial `<Canvas>` for the reconciler-mismatch warning.
- drei WebGL-failure fallback prop name in the installed minor (topic 4) — check types.
- Whether to route scroll through drei `ScrollControls` or GSAP `ScrollTrigger` (or ScrollSmoother) — decide in design to avoid double scroll engines.
