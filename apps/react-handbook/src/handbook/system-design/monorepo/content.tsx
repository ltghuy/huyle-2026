import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { AffectedDemo } from "./affected-demo";
import { ArchitectureDemo } from "./architecture-demo";
import { BoundariesDemo } from "./boundaries-demo";
import { CiDemo } from "./ci-demo";
import { PracticesDemo } from "./practices-demo";
import { ToolsDemo } from "./tools-demo";
import { VersioningDemo } from "./versioning-demo";

const TURBO = "https://turborepo.dev/docs";
const NX = "https://nx.dev/docs";

const TOPICS = [
  { id: "requirements", title: "Requirements and architecture" },
  { id: "tooling", title: "Choosing the tooling" },
  { id: "affected", title: "Deep dive: the affected graph and caching" },
  { id: "boundaries", title: "Deep dive: boundaries and ownership" },
  { id: "dependencies", title: "Deep dive: dependencies and versioning" },
  { id: "ci", title: "Deep dive: CI and developer experience" },
  { id: "practices", title: "Best practices: structure, layers and owners" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function MonorepoHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          &quot;We have a marketing site, a web app and an admin tool. They share a UI kit, an API client and a pile of config. Design the repository they live
          in.&quot; This prompt has no screen to draw. The product is the codebase, the users are the engineers, and the non-functional requirements are CI time,
          ownership and safe releases. It still fits{" "}
          <Link href={topicHref("method")} className={inline}>
            the design method
          </Link>
          : scope it, sketch the architecture, then go deep on the parts that decide whether a monorepo stays fast and untangled as it grows.
        </p>
        <p>
          Every demo below works on the same sample repo: ten projects in four layers plus shared config. The tools are compared, not taught. The ideas carry over to whichever one
          you pick.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={<>Start with who uses the repo and what they need from it. Then draw the projects and the layer that runs them.</>}
        points={[
          <>
            <strong>Functional:</strong> share code between apps without publishing it first; change a shared package and update every consumer in the same
            pull request; build, test and lint each project on its own; publish the few packages other repos use.
          </>,
          <>
            <strong>Non-functional:</strong> CI time per pull request grows with the size of the change, not the size of the repo; every directory has an owner who
            reviews changes to it; a release never ships a package against a dependency it wasn&apos;t tested with; a new engineer can run one app on day one.
          </>,
          <>
            <strong>Scope cuts:</strong> how many apps and teams (three and five here), whether anything is published outside the repo (three packages are), and
            whether it&apos;s JavaScript only (it is; a multi-language repo changes the tooling).
          </>,
          <>
            <strong>Architecture:</strong> apps on top, then feature packages, then UI and data, then utilities, with config every project shares. Under them sit
            two pieces of tooling: the package manager&apos;s workspace (one install, local packages linked) and a task runner (task graph, cache, affected runs).
            Name the alternatives: a polyrepo, or micro-frontends, which is a deploy strategy and works with either repo shape.
          </>,
        ]}
        demoTitle="the sample repo and its alternatives"
        demo={<ArchitectureDemo />}
        advice={[
          {
            do: <>Lay projects out in layers that only depend downward, and decide early what gets published and what stays internal.</>,
            avoid: <>Moving every repo into one folder and calling it a monorepo, with no task graph, no cache and no boundaries.</>,
          },
        ]}
        links={[
          { label: "monorepo.tools", href: "https://monorepo.tools/" },
          { label: "Why Google stores billions of lines in one repo", href: "https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/" },
          { label: "The design method", href: topicHref("method") },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Monorepo tooling comes in three layers, and most repos combine one tool from each: a <strong>package manager</strong> that installs and links, a{" "}
            <strong>task runner</strong> that orders, caches and filters tasks, and a <strong>release tool</strong> that bumps versions and writes changelogs.
          </>
        }
        points={[
          <>
            Package managers (pnpm, npm, Yarn) give you workspaces. pnpm adds the <code>workspace:</code> protocol, strict <code>node_modules</code> and catalogs
            for shared versions. None of them caches tasks.
          </>,
          <>
            Task runners (Turborepo, Nx) read the dependency graph, hash each task&apos;s inputs, and skip or restore what they&apos;ve seen before, locally and from a
            shared cache. Nx also ships boundary rules, generators and its own release command. Turborepo keeps a smaller core and points to Changesets for releases.
          </>,
          <>
            Pick by what you need, not by popularity. Tick your needs in the demo to see which common stacks cover them.
          </>,
        ]}
        demoTitle="which tools cover your needs"
        demo={<ToolsDemo />}
        advice={[
          {
            do: <>Choose one tool per layer from a written list of needs, and pin their versions in the repo.</>,
            avoid: <>Two task runners in one repo, or a task runner doing a package manager&apos;s job.</>,
          },
        ]}
        links={[
          { label: "pnpm: workspaces", href: "https://pnpm.io/workspaces" },
          { label: "Turborepo docs", href: TURBO },
          { label: "Nx docs", href: NX },
          { label: "Changesets", href: "https://github.com/changesets/changesets" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Two ideas make a big monorepo fast. <strong>Affected</strong>: a change can only break the projects that depend on it, so run only those.{" "}
            <strong>Caching</strong>: a task with the same inputs gives the same outputs, so hash the inputs and reuse the result when the hash matches.
          </>
        }
        points={[
          <>
            The task graph orders the work. A project&apos;s build waits for its dependencies&apos; builds (<code>^build</code>); tasks with no path between them
            run in parallel.
          </>,
          <>
            A task&apos;s hash covers its own files, its config, the lockfile entries and env vars it uses, and its dependencies&apos; hashes. On a hit the runner
            restores the saved outputs and replays the logs instead of running the task.
          </>,
          <>
            Affected is coarse and the cache is precise. Change the ESLint config and every project is affected, but only lint misses the cache. Revert a change
            and the old hashes hit again.
          </>,
          <>
            A local cache only helps the machine that filled it. A shared (remote) cache lets CI reuse your laptop&apos;s builds and lets every pull request reuse
            main&apos;s.
          </>,
        ]}
        demoTitle="change a package, run a task, run it again"
        demo={<AffectedDemo />}
        advice={[
          {
            do: <>Declare every task&apos;s outputs and the env vars it reads, so cache keys are complete, and share the cache with CI.</>,
            avoid: <>Tasks that read undeclared env vars or the clock: the cache will happily restore a stale result.</>,
          },
        ]}
        links={[
          { label: "Turborepo: caching", href: `${TURBO}/crafting-your-repository/caching` },
          { label: "Nx: how caching works", href: `${NX}/concepts/how-caching-works` },
          { label: "Nx: affected", href: `${NX}/features/ci-features/affected` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Without rules, a monorepo turns into one big app: anything can import anything, and every change affects everything. Boundaries keep the graph
            shaped the way you drew it, and ownership tells you who has to agree to a change.
          </>
        }
        points={[
          <>
            <strong>Layer rules:</strong> each kind of project may only import the kinds below it. Tag projects (by type, and often by domain or team) and let a
            lint rule reject imports that break the rules.
          </>,
          <>
            <strong>Public entry points:</strong> a package&apos;s <code>exports</code> field is its API. A deep import into <code>src/</code> couples you to
            files its owners think are private.
          </>,
          <>
            <strong>No cycles:</strong> two packages that import each other can&apos;t be built in any order, and neither can change without the other.
          </>,
          <>
            <strong>Ownership:</strong> a CODEOWNERS file maps paths to teams (the last matching pattern wins), and branch protection requires one of them to
            approve. <strong>Internal packages</strong> can change in lockstep with their consumers; <strong>published</strong> ones need versions and a changelog
            because other repos depend on them.
          </>,
        ]}
        demoTitle="try an import between two projects"
        demo={<BoundariesDemo />}
        advice={[
          {
            do: <>Enforce layer and entry-point rules in lint and CI from the first week, and give every directory an owner.</>,
            avoid: <>Boundaries that live only in a wiki, or deep imports &quot;just this once&quot;.</>,
          },
        ]}
        links={[
          { label: "Nx: enforce module boundaries", href: `${NX}/features/enforce-module-boundaries` },
          { label: "Turborepo: boundaries (experimental)", href: `${TURBO}/reference/boundaries` },
          {
            label: "GitHub: about code owners",
            href: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners",
          },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Shared code makes dependency mistakes everyone&apos;s problem. Three decisions matter: one version of each library or many, whether a project can use
            a package it never declared, and how published packages get versioned.
          </>
        }
        points={[
          <>
            <strong>Workspace linking:</strong> internal packages are symlinked, not downloaded (<code>&quot;@acme/ui&quot;: &quot;workspace:*&quot;</code>), and
            the protocol becomes a real version when published.
          </>,
          <>
            <strong>Single-version policy</strong> (pnpm catalogs, or a lint check) means one copy of each library and one upgrade for everyone, which every
            project&apos;s tests must pass. <strong>Independent versions</strong> let each team upgrade alone, at the price of drift and duplicate copies.
          </>,
          <>
            <strong>Hoisting and phantom dependencies:</strong> a flat <code>node_modules</code> lets code import packages it never declared, until someone
            else removes them. An isolated layout (pnpm&apos;s default) links only declared dependencies, so the mistake fails right away.
          </>,
          <>
            <strong>Releases:</strong> record each change with a bump type, then version everything at once. A dependent whose range the new version leaves
            gets a patch bump (Changesets; since 3.0 that includes peer dependencies). A fixed group moves in lockstep; independent versions move alone.
          </>,
        ]}
        demoTitle="dependency policy, a phantom dependency, and a release"
        demo={<VersioningDemo />}
        advice={[
          {
            do: <>Default to one version per library, an isolated node_modules, and a changeset with every change to a published package.</>,
            avoid: <>Importing what you didn&apos;t declare, or hand-editing versions and changelogs.</>,
          },
        ]}
        links={[
          { label: "pnpm: catalogs", href: "https://pnpm.io/catalogs" },
          { label: "pnpm: why strict node_modules", href: "https://pnpm.io/motivation" },
          { label: "Changesets: config", href: "https://changesets.dev/guide/config" },
        ]}
      />

      <Topic
        {...topic(5)}
        intro={
          <>
            &quot;Won&apos;t CI get slow?&quot; is the first objection to any monorepo. Running everything does grow with the whole repo. Running only affected
            projects, skipping cached tasks and spreading the rest over agents makes CI grow with the change instead.
          </>
        }
        points={[
          <>
            The four strategies stack. Affected runs depend on git history (fetch enough of it in CI); the shared cache needs complete hashes; parallel agents
            can&apos;t beat the longest chain of dependent tasks except by caching tasks on it.
          </>,
          <>
            <strong>Run one app without building the world:</strong> start its dev server and let the runner build only its dependencies, or have the app consume
            packages as source (no build step, nothing to cache, more work for the app&apos;s bundler).
          </>,
          <>
            <strong>Incremental type checking:</strong> TypeScript project references and <code>tsc -b</code> rebuild only stale packages. The cost is{" "}
            <code>composite</code> configs and emitted declaration files.
          </>,
          <>
            <strong>Generators</strong> scaffold a new package with the right config, tags and owners, so new code starts inside the rules. They do need
            maintaining. <strong>Editor speed</strong> drops as the repo grows: project references and scoped workspaces keep the language server on what you
            have open.
          </>,
        ]}
        demoTitle="CI time as the repo grows"
        demo={<CiDemo />}
        advice={[
          {
            do: <>Run affected tasks against the last green main, share the cache with every pull request, and measure CI time per pull request over time.</>,
            avoid: <>Shallow CI checkouts (every package looks changed), or adding agents before you add caching.</>,
          },
        ]}
        links={[
          { label: "Turborepo: run --affected", href: `${TURBO}/reference/run` },
          { label: "Turborepo: internal packages", href: `${TURBO}/core-concepts/internal-packages` },
          { label: "TypeScript: project references", href: "https://www.typescriptlang.org/docs/handbook/project-references.html" },
          { label: "Nx: generators", href: `${NX}/features/generate-code` },
        ]}
      />

      <Topic
        {...topic(6)}
        intro={
          <>
            A lot of the pain in a large monorepo goes back to choices made in its first weeks: where code goes, how a package is shaped, and who reviews
            what. These rules settle them early. Try them on the sample repo in the demo.
          </>
        }
        points={[
          <>
            Keep code in two top-level folders: <code>apps/</code> for what you deploy and <code>packages/</code> for what you share. The root holds only
            workspace and tooling files (the root <code>package.json</code>, the workspace file, the task pipeline, CODEOWNERS), so the whole layout fits on
            one screen.
          </>,
          <>
            Give each package one purpose, its own <code>package.json</code>, and an <code>exports</code> field listing its public entry points. If you need
            &quot;and&quot; to describe a package, split it. Whatever <code>exports</code> leaves out is private, and its owners can change it without breaking
            anyone.
          </>,
          <>
            Put every package under one npm scope and name it after its folder, so <code>packages/ui</code> is <code>@acme/ui</code>. Mark internal packages{" "}
            <code>&quot;private&quot;: true</code> so nobody publishes them by accident.
          </>,
          <>
            Agree on the layers before the second app arrives. Here that is apps, then features, then UI and data, then utilities, with imports only going down.
            Tag each project with its layer and check the rule in lint and CI, so it holds even when a reviewer misses it.
          </>,
          <>
            Ship shared config (TypeScript, ESLint, test setup) as packages that projects extend. Pin the package manager in the root <code>package.json</code>{" "}
            and keep third-party versions in one catalog, so laptops and CI install the same tools.
          </>,
          <>
            Give every project one owning team in CODEOWNERS. Write the catch-all first and specific paths after it, because the last matching line wins. Then
            turn on required code-owner review in branch protection; without it, owners are only requested as reviewers.
          </>,
        ]}
        demoTitle="explore the layout and test CODEOWNERS"
        demo={<PracticesDemo />}
        advice={[
          {
            do: <>Start with apps/ and packages/, one purpose and an exports field per package, one scope, layers checked in lint, and a catch-all on the first CODEOWNERS line.</>,
            avoid: <>Code at the repo root, a <code>common</code> or <code>shared</code> package that everything imports, or a catch-all at the bottom of CODEOWNERS.</>,
          },
        ]}
        links={[
          {
            label: "GitHub: about code owners",
            href: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners",
          },
          { label: "Turborepo: structuring a repository", href: `${TURBO}/crafting-your-repository/structuring-a-repository` },
          { label: "Node.js: package entry points", href: "https://nodejs.org/api/packages.html#package-entry-points" },
          { label: "npm: the private field", href: "https://docs.npmjs.com/cli/configuring-npm/package-json#private" },
        ]}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-foreground/85">
        <p>
          <strong>Back to the method:</strong> this case study used the same stages as{" "}
          <Link href={topicHref("method")} className={inline}>
            the design method
          </Link>
          ,{" "}
          <Link href={topicHref("news-feed")} className={inline}>
            the news feed
          </Link>{" "}
          and{" "}
          <Link href={topicHref("autocomplete")} className={inline}>
            the autocomplete
          </Link>
          , but the users are engineers and the bars are CI time, ownership and release safety. Chat and design-system case studies are next.
        </p>
      </div>
    </div>
  );
}
