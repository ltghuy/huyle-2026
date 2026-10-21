import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { ArchitectureDemo } from "./architecture-demo";
import { CompositionDemo } from "./composition-demo";
import { DeployDemo } from "./deploy-demo";
import { FitDemo } from "./fit-demo";
import { RoutingDemo } from "./routing-demo";
import { SharingDemo } from "./sharing-demo";
import { StylingDemo } from "./styling-demo";

const MF = "https://module-federation.io";
const FOWLER = "https://martinfowler.com/articles/micro-frontends.html";
const GEERS = "https://micro-frontends.org/";

const TOPICS = [
  { id: "requirements", title: "Requirements and architecture" },
  { id: "fit", title: "Should you use micro frontends?" },
  { id: "composition", title: "Composition: where the page is put together" },
  { id: "sharing", title: "Deep dive: shared dependencies" },
  { id: "communication", title: "Deep dive: routing and communication" },
  { id: "releases", title: "Deep dive: releases and failure isolation" },
  { id: "styling", title: "Deep dive: styling and consistency" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function MicroFrontendsHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          &quot;Our store is built by four teams: a platform team and the catalog, checkout and account teams. Every release waits for all of them. Design a
          frontend that lets each team ship on its own.&quot; Micro frontends are the usual answer: split the frontend into pieces that are built, tested and
          released separately, then put them back together so the shopper sees one store. The split mostly solves an organisational problem, and you pay for it
          in runtime integration, page weight and coordination. A strong answer says when that trade is worth making, then works through{" "}
          <Link href={topicHref("method")} className={inline}>
            the design method
          </Link>{" "}
          as usual.
        </p>
        <p>
          Every demo below works on the same sample store: a shell and three micro frontends, with a product page that shows pieces from three teams at once.
          The composition approaches and tools are compared side by side and none of them is taught on its own.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={<>Start with who needs what. Here the shoppers need one fast, consistent store and the engineers need to release without waiting for each other.</>}
        points={[
          <>
            <strong>Functional:</strong> one store that looks and behaves like one product; each team owns its pages and widgets end to end, from UI to the API it
            calls; the header and the cart count are shared across every page.
          </>,
          <>
            <strong>Non-functional:</strong> a team releases and rolls back without the others; a broken piece doesn&apos;t take the page down; the product page
            stays inside its load-time and JavaScript budgets; the pieces look consistent; content is in the HTML for search engines.
          </>,
          <>
            <strong>Scope cuts:</strong> how many teams (four here), whether pieces from different teams share one page (yes, on the product page), whether teams
            may pick their own framework (no), and whether a legacy app has to keep running alongside (not here).
          </>,
          <>
            <strong>Architecture:</strong> a thin shell owned by the platform team handles routing, the header and the layout. Each team&apos;s micro frontend has
            its own repository or folder and pipeline and is deployed to its own versioned URL, and the shell keeps a manifest of which versions are live. Name the
            alternatives: one app, or a modular monolith that keeps one deploy.
          </>,
        ]}
        demoTitle="the sample store and its alternatives"
        demo={<ArchitectureDemo />}
        advice={[
          {
            do: <>Split by business domain, so each team owns a slice of the product (catalog, checkout) with its pages, widgets and API.</>,
            avoid: <>Splitting by technical layer (a header team, a components team, a data team): every feature then needs all of them.</>,
          },
        ]}
        links={[
          { label: "Cam Jackson: Micro Frontends", href: FOWLER },
          { label: "micro-frontends.org", href: GEERS },
          { label: "The design method", href: topicHref("method") },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Micro frontends fix one problem well: teams that block each other&apos;s releases. If that isn&apos;t your problem, they add cost and solve nothing. A
            senior answer argues from criteria, and the first question is how many teams there are.
          </>
        }
        points={[
          <>One team has nobody to release independently from. Keep one app with clear feature folders.</>,
          <>
            Several teams that rarely collide do well with a modular monolith: packages with enforced boundaries and owners in one deploy, as in{" "}
            <Link href={topicHref("monorepo")} className={inline}>
              the monorepo case study
            </Link>
            .
          </>,
          <>
            When releases block each other every week, or a legacy app must be replaced one route at a time, separate releases start paying for themselves. Then
            pick the lightest composition that fits: a route-level split when each team owns whole pages, and composition on one page only when pieces have to
            share a page.
          </>,
          <>
            Count the cost before you commit: a platform team to own the shell and shared libraries, contracts between teams, more to monitor, and every extra
            framework loaded by every visitor.
          </>,
        ]}
        demoTitle="describe your situation and get a recommendation"
        demo={<FitDemo />}
        advice={[
          {
            do: <>Write down the release conflict you are solving, and try a route-level split before you compose pieces on one page.</>,
            avoid: <>Adopting micro frontends so each team can choose its own framework, or because the architecture looks modern.</>,
          },
        ]}
        links={[
          { label: "Next.js: Multi-Zones", href: "https://nextjs.org/docs/app/guides/multi-zones" },
          { label: "Vercel: Microfrontends", href: "https://vercel.com/docs/microfrontends" },
          { label: "Building Micro-Frontends, 2nd ed.", href: "https://www.oreilly.com/library/view/building-micro-frontends-2nd/9781098170776/" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Composition is where separately built pieces become one page, and it is the decision every later one depends on. You can compose at the router, at
            build time, on the server, at the edge, in the browser, or with iframes.
          </>
        }
        points={[
          <>
            A <strong>route-level split</strong> gives each team whole pages and never mixes them. It is the simplest form, and moving between teams&apos; pages
            becomes a full page load.
          </>,
          <>
            <strong>Build-time packages</strong> are easy, but the shell has to rebuild to ship a team&apos;s change. That brings back the shared release train you
            were trying to remove.
          </>,
          <>
            <strong>Server and edge composition</strong> put every piece in the first HTML, which is good for search and first paint, but someone has to run the
            layer that stitches the fragments. On the server the page waits for the slowest fragment; at the edge, cached pieces arrive first and personalised
            ones follow.
          </>,
          <>
            <strong>Client-side runtime</strong> composition (Module Federation, import maps) needs only static files and shares libraries well. The cost is a
            chain of requests before content appears. <strong>Iframes</strong> isolate everything, and you lose shared libraries, simple routing and easy
            accessibility.
          </>,
        ]}
        demoTitle="compose the product page six ways"
        demo={<CompositionDemo />}
        advice={[
          {
            do: <>Pick per page: a route-level split by default, server or edge composition where pieces share a page and SEO matters, runtime composition where they don&apos;t.</>,
            avoid: <>A client-side waterfall on a page that needs fast first paint, with no preloading of the manifest and entry files.</>,
          },
        ]}
        links={[
          { label: "Module Federation docs", href: `${MF}/guide/start/index.html` },
          { label: "single-spa: recommended setup", href: "https://single-spa.js.org/docs/recommended-setup/" },
          { label: "nginx: SSI module", href: "https://nginx.org/en/docs/http/ngx_http_ssi_module.html" },
          { label: "Podium", href: "https://podium-lib.io/" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Four teams that each bundle the framework would make every shopper download it four times. Runtime composition avoids that with a share scope: every
            piece registers the versions it brings, and the runtime decides which copy each piece uses.
          </>
        }
        points={[
          <>
            Module Federation picks the highest version in the scope that fits each piece&apos;s accepted range, which defaults to the range in its{" "}
            <code>package.json</code>. A piece that finds nothing compatible falls back to its own copy, so two versions end up on one page.
          </>,
          <>
            Libraries that keep state, such as React, must be <code>singleton</code>: one copy for everyone. A piece whose range the singleton doesn&apos;t fit gets
            a console warning and runs on it anyway, or fails to load with <code>strictVersion</code>. A copy that has already loaded is never swapped for a higher
            version that registers later, so load order matters.
          </>,
          <>
            Share subpaths too. Sharing <code>react-dom</code> without a trailing slash leaves <code>react-dom/client</code> bundled locally, which quietly loads
            a second React DOM.
          </>,
          <>
            The design system is the other big shared dependency. Sharing more makes pages smaller and couples upgrades; sharing less frees each team and grows
            the page. A common setup shares the framework, router and design system as singletons and lets each piece bundle everything else. Roll out a design
            system major the way you would an API change: support the old and new versions for a while.
          </>,
        ]}
        demoTitle="which copy of a shared library does each piece get?"
        demo={<SharingDemo />}
        advice={[
          {
            do: <>Make the framework and design system singletons, align their major versions across teams on a schedule, and set a size budget per piece.</>,
            avoid: <>Leaving sharing to defaults, then finding two copies of React in production through an &quot;Invalid hook call&quot; error.</>,
          },
        ]}
        links={[
          { label: "Module Federation: shared", href: `${MF}/configure/shared.html` },
          { label: "Module Federation: shareStrategy", href: `${MF}/configure/shareStrategy.html` },
          { label: "webpack: ModuleFederationPlugin", href: "https://webpack.js.org/plugins/module-federation-plugin/" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            How pieces find each other and talk decides how coupled the teams really are. Keep the shared surface small and treat every part of it as a
            versioned contract.
          </>
        }
        points={[
          <>
            Routing is two-level. The shell maps top-level prefixes to pieces (<code>/products</code> to catalog, <code>/cart</code> to checkout) and each piece
            routes inside its prefix. Adding a section means one change to the shell&apos;s table; everything else stays inside a team.
          </>,
          <>
            Prefer the URL for state that should survive a reload, and browser events for news between pieces (an item was added). Give events a team prefix,
            and have a piece read current state when it mounts, since it can&apos;t receive events fired before it loaded.
          </>,
          <>
            Avoid a global store shared by every piece. It ties all teams to one state shape and one library version, and changing it becomes a coordinated
            release.
          </>,
          <>
            Event payloads, props passed from the shell and URL parameters are APIs. Adding a field is safe. Renaming, removing or changing a field&apos;s type
            breaks every consumer still on the old shape, at runtime and with no compile error.
          </>,
        ]}
        demoTitle="route a URL, then change an event's shape"
        demo={<RoutingDemo />}
        advice={[
          {
            do: <>Publish each contract as a typed package or schema, make only additive changes, and run consumer contract tests in every team&apos;s pipeline.</>,
            avoid: <>Pieces reaching into each other&apos;s DOM, globals or storage keys, or a shared store that every team writes to.</>,
          },
        ]}
        links={[
          { label: "MDN: CustomEvent", href: "https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent" },
          { label: "Cam Jackson: Micro Frontends", href: FOWLER },
          { label: "micro-frontends.org", href: GEERS },
        ]}
      />

      <Topic
        {...topic(5)}
        intro={
          <>
            Independent release is the reason to adopt micro frontends, and containing failure is what makes it safe. Each piece should be able to go out, go
            wrong and come back without touching the others.
          </>
        }
        points={[
          <>
            Deploy each build to its own immutable, versioned URL and let the shell read a manifest of live versions. Releasing changes one manifest entry, and
            rolling back points it at the previous build, which is still on the CDN.
          </>,
          <>
            Wrap every piece in an error boundary with a fallback, and give it a timeout, so a crash or a slow server costs one slot instead of the page. Keep the
            shell small and boring: nothing above it can catch its errors.
          </>,
          <>
            Boundaries don&apos;t catch a broken contract, because the page renders with wrong data. That needs contract tests before release and monitoring of
            errors and key numbers per piece after it.
          </>,
          <>
            Roll out gradually: send a share of users to the new version through the manifest and watch that piece&apos;s errors before going to everyone. The
            catch is that two versions run at once, so contracts must work with both.
          </>,
        ]}
        demoTitle="release, break and roll back one piece"
        demo={<DeployDemo />}
        advice={[
          {
            do: <>Give every slot a boundary, a timeout and a fallback, tag errors and metrics with the piece and version, and keep old builds on the CDN.</>,
            avoid: <>Deploying all pieces together &quot;to be safe&quot;: that is a distributed monolith with all of the cost and none of the independence.</>,
          },
        ]}
        links={[
          { label: "React: error boundaries", href: "https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary" },
          { label: "Module Federation: runtime plugins", href: `${MF}/guide/runtime/runtime-plugins.html` },
          { label: "Module Federation: manifest", href: `${MF}/guide/basic/manifest-snapshot.html` },
        ]}
      />

      <Topic
        {...topic(6)}
        intro={
          <>
            Style collisions are easy to ship when teams release separately. Two teams write <code>.title</code>, the one that loads last wins, and
            the header changes when checkout deploys.
          </>
        }
        points={[
          <>
            A team prefix on every class (<code>checkout-title</code>) is cheap and works if everyone follows it. Scoped class names, generated by CSS Modules
            and similar tools, do the same automatically. Neither stops element selectors such as <code>button</code> from leaking.
          </>,
          <>
            A shadow tree blocks selectors in both directions. Inherited properties (font, color) and CSS custom properties still cross the boundary, so theme
            tokens reach every piece. The cost is that global styles, including the design system&apos;s, don&apos;t; each shadow root has to load them itself.
          </>,
          <>
            Consistency comes from one design system with shared tokens for color, spacing and type, owned by the platform team and loaded once. It should hold UI
            only, never business logic.
          </>,
        ]}
        demoTitle="make checkout's styles leak, then stop them"
        demo={<StylingDemo />}
        advice={[
          {
            do: <>Use scoped class names by default, theme through shared custom properties, and keep global CSS to a reset and the design system.</>,
            avoid: <>Element or generic class selectors in a piece&apos;s CSS, and a design system copied into each team&apos;s repository.</>,
          },
        ]}
        links={[
          { label: "MDN: using shadow DOM", href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM" },
          { label: "MDN: ::part()", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::part" },
          { label: "CSS Modules", href: "https://github.com/css-modules/css-modules" },
        ]}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-foreground/85">
        <p>
          <strong>Back to the method:</strong> this case study used the same stages as{" "}
          <Link href={topicHref("method")} className={inline}>
            the design method
          </Link>{" "}
          and the other case studies:{" "}
          <Link href={topicHref("news-feed")} className={inline}>
            the news feed
          </Link>
          ,{" "}
          <Link href={topicHref("autocomplete")} className={inline}>
            the autocomplete
          </Link>{" "}
          and{" "}
          <Link href={topicHref("monorepo")} className={inline}>
            the monorepo
          </Link>
          . The monorepo and micro frontends answer different questions and often go together: one is how teams share code, the other is how they release it.
        </p>
      </div>
    </div>
  );
}
