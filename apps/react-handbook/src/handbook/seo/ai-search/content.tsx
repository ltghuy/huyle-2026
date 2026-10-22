import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref, type TopicSlug } from "@/practices/catalog";

import { AnswerDemo } from "./answer-demo";
import { BotsDemo } from "./bots-demo";
import { ControlsDemo } from "./controls-demo";
import { LlmsDemo } from "./llms-demo";
import { LogDemo } from "./log-demo";

const GOOGLE = "https://developers.google.com";

const TOPICS = [
  { id: "ai-crawlers", title: "AI crawlers" },
  { id: "ai-answers", title: "How AI search uses pages" },
  { id: "controls", title: "Controls, vendor by vendor" },
  { id: "llms-txt", title: "llms.txt" },
  { id: "preferences-traffic", title: "Usage preferences and bot traffic" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

function PageLink({ slug, children }: { slug: TopicSlug; children: React.ReactNode }) {
  return (
    <Link href={topicHref(slug)} className={inline}>
      {children}
    </Link>
  );
}

export function AiSearchHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          AI assistants and answer engines read pages, quote them and link to them, and the questions land on frontend engineers: should we block
          the AI bots, add an llms.txt, rewrite pages for AI? The answers depend on which bot and which product. This page sorts the crawlers by
          what they do, shows how AI answers pick pages, lists the controls each vendor documents, and covers llms.txt and the newer ways to state
          usage preferences. This site now allows AI search and user-requested fetches, disallows training crawlers, and serves an llms.txt; the
          demos read both files live. Bot names change often, so everything here was checked against each vendor&apos;s documentation on 22
          October 2026.
        </p>
        <p>
          It builds on <PageLink slug="crawling-indexing">Crawling and indexing control</PageLink> for robots.txt and robots meta rules, and on{" "}
          <PageLink slug="javascript-seo">JavaScript and rendering SEO</PageLink> for why content belongs in the server HTML.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            Most AI vendors now run several bots with separate jobs: one collects pages to train models, one builds the index their AI search cites
            from, and one fetches a single page because a user asked. robots.txt treats each name on its own, so blocking one leaves the others alone.
          </>
        }
        points={[
          <>
            OpenAI: <code>GPTBot</code> (training), <code>OAI-SearchBot</code> (ChatGPT search), <code>ChatGPT-User</code> (user requests).
            Anthropic: <code>ClaudeBot</code>, <code>Claude-SearchBot</code>, <code>Claude-User</code>. Perplexity: <code>PerplexityBot</code> and{" "}
            <code>Perplexity-User</code>. Meta, Amazon, Mistral and DuckDuckGo document similar sets.
          </>,
          <>
            <code>Google-Extended</code> and <code>Applebot-Extended</code> crawl nothing. They are tokens that say whether pages Googlebot or Applebot
            already fetched may train Gemini or Apple&apos;s models. Disallowing them leaves you in Google and Apple search.
          </>,
          <>
            OpenAI, Perplexity, Google, Meta and Amazon say their user-request fetchers may ignore robots.txt, since a person asked for the page.
            Anthropic says all of its bots follow it.
          </>,
          <>
            Only Googlebot, Bingbot and Applebot document rendering JavaScript. Assume every other AI crawler reads the server HTML only.
          </>,
        ]}
        demoTitle="test robots.txt rules against every documented AI bot"
        demo={<BotsDemo />}
        advice={[
          {
            do: <>Decide per job (training, search, user request), then list each vendor&apos;s tokens for that job, and review the list a few times a year.</>,
            avoid: <>Blocking a search bot to keep content out of training, or expecting robots.txt to stop a fetch a user asked for.</>,
          },
        ]}
        links={[
          { label: "OpenAI: crawlers", href: "https://developers.openai.com/api/docs/bots" },
          {
            label: "Anthropic: crawlers",
            href: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler",
          },
          { label: "Google: common crawlers", href: `${GOOGLE}/crawling/docs/crawlers-fetchers/google-common-crawlers` },
          { label: "Perplexity: crawlers", href: "https://docs.perplexity.ai/guides/bots" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            An AI answer is built from search results. Google&apos;s AI Overviews and AI Mode run on Googlebot and the normal Search index, and Bing&apos;s
            Copilot uses Bing&apos;s index. ChatGPT, Claude and Perplexity search with their own crawlers and, for ChatGPT, partner search providers.
          </>
        }
        points={[
          <>
            Google says a page needs nothing extra to appear in AI features: it must be indexed and eligible to show with a snippet. No special
            markup or AI text files are needed.
          </>,
          <>
            The engine splits a question into related searches (query fan-out), retrieves pages for each, and writes an answer grounded in them, with
            links to its sources.
          </>,
          <>
            Google calls optimizing for generative AI search &quot;still SEO&quot; and tells sites they can ignore chunking or rewriting content for
            AI. Making a page for every fan-out query to game rankings counts as scaled content abuse.
          </>,
          <>
            Search Console counts AI Overviews and AI Mode inside the Web search type, where an AI Overview takes one position, and adds an
            impressions-only Generative AI report. Bing Webmaster Tools has an AI Performance report with Copilot citations.
          </>,
        ]}
        demoTitle="see which pages of this site an AI answer could cite"
        demo={<AnswerDemo />}
        advice={[
          {
            do: <>Keep the basics right: indexable pages, server-rendered content, a clear topic per URL and a useful snippet.</>,
            avoid: <>Separate &quot;AI versions&quot; of pages, or splitting content into fragments in the hope of being quoted.</>,
          },
        ]}
        links={[
          { label: "Google: AI features and your website", href: `${GOOGLE}/search/docs/appearance/ai-features` },
          { label: "Google: optimizing for AI search", href: `${GOOGLE}/search/docs/fundamentals/ai-optimization-guide` },
          { label: "Bing: webmaster guidelines", href: "https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Each vendor documents different switches, and the one that keeps a site out of training rarely keeps it out of AI answers. Start from what
            you want, then set each vendor&apos;s controls.
          </>
        }
        points={[
          <>
            Google: <code>Google-Extended</code> covers Gemini training and grounding only. AI Overviews and AI Mode follow Googlebot,{" "}
            <code>noindex</code> and the snippet controls (<code>nosnippet</code>, <code>data-nosnippet</code>, <code>max-snippet</code>), plus a
            Search Console setting, Search generative AI, that is set to include by default.
          </>,
          <>
            Leaving Google&apos;s AI features without that setting means leaving Search (<code>noindex</code>, or blocking Googlebot) or giving up
            snippets.
          </>,
          <>
            Bing: <code>noindex</code> keeps a page out of search and Copilot, <code>noarchive</code> keeps its content out of Copilot answers, and{" "}
            <code>nocache</code> limits Copilot to the URL, title and snippet.
          </>,
          <>
            OpenAI, Anthropic and Perplexity document only their crawlers. Disallow the training bot to opt out of training and keep the search bot
            allowed to stay in their answers.
          </>,
        ]}
        demoTitle="pick a goal and see the settings each vendor needs"
        demo={<ControlsDemo />}
        advice={[
          {
            do: <>Write the goal down per vendor, set the matching tokens and tags, and recheck after vendors add bots.</>,
            avoid: <>Treating Google-Extended as an AI Overviews switch, or blocking Googlebot to get out of AI features.</>,
          },
        ]}
        links={[
          { label: "Google: robots meta tag and snippet rules", href: `${GOOGLE}/search/docs/crawling-indexing/robots-meta-tag` },
          { label: "Google: Search generative AI control", href: "https://support.google.com/webmasters/answer/16908024" },
          { label: "Bing: webmaster guidelines", href: "https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            llms.txt is a Markdown file at the root of a site that gives a language model a short map of it: the name, a summary and links to the
            pages that matter. Jeremy Howard of Answer.AI proposed it in 2024; it&apos;s an informal proposal, now at version 2.
          </>
        }
        points={[
          <>
            The format: an H1 with the name (the only required part), a blockquote summary, optional notes, then H2 sections that list{" "}
            <code>[name](url): notes</code> links. Version 2 also describes Markdown copies of pages and finding them with{" "}
            <code>rel=&quot;alternate&quot;</code> links.
          </>,
          <>
            <code>llms-full.txt</code>, a single file with all the content, is a convention some sites use, and it isn&apos;t part of the proposal.
          </>,
          <>
            Google says Google Search doesn&apos;t use the file and that it neither helps nor harms a site. No AI search vendor documents reading other
            sites&apos; files. Its real use is tools and agents pointed at a site on purpose, such as a coding assistant reading library docs.
          </>,
          <>
            This site builds its file at build time from the same page list as the sitemap, so it can&apos;t fall out of date.
          </>,
        ]}
        demoTitle="check this site's llms.txt, or one you write"
        demo={<LlmsDemo />}
        advice={[
          {
            do: <>Generate it from your page data if your users point tools at your docs, and keep it short.</>,
            avoid: <>Adding it to win search or AI traffic, or maintaining it by hand next to a sitemap.</>,
          },
        ]}
        links={[
          { label: "The llms.txt proposal", href: "https://llmstxt.org/" },
          { label: "Google: optimizing for AI search", href: `${GOOGLE}/search/docs/fundamentals/ai-optimization-guide` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            robots.txt says which paths a bot may fetch, not what may be done with a page afterwards. Two newer efforts try to state that, and CDNs now
            enforce bot rules for sites that want more than a request.
          </>
        }
        points={[
          <>
            The IETF AI Preferences drafts define three labels (<code>train-ai</code>, <code>ai-use</code>, <code>search</code>) and a{" "}
            <code>Content-Usage</code> rule for robots.txt or an HTTP header, such as <code>Content-Usage: train-ai=n</code>. They are still drafts.
          </>,
          <>
            Cloudflare&apos;s Content Signals use different labels (<code>search</code>, <code>ai-input</code>, <code>ai-train</code>) in a{" "}
            <code>Content-signal</code> line. No AI vendor documents honoring either yet, so this site sends neither.
          </>,
          <>
            Enforcement lives at the CDN: Cloudflare can block training, agent or search bots by category and offers pay per crawl, which answers
            with HTTP 402 and a price.
          </>,
          <>
            A user agent is only a claim. Check a bot against its vendor&apos;s published IP list (OpenAI, Perplexity and Common Crawl publish them)
            or with a reverse DNS lookup before trusting it in logs or rules.
          </>,
        ]}
        demoTitle="read AI bot traffic in an access log"
        demo={<LogDemo />}
        advice={[
          {
            do: <>Verify bots by address, watch which ones fetch disallowed paths, and enforce at the CDN what robots.txt can only ask.</>,
            avoid: <>Counting user agents as proof, or relying on draft preference lines that no crawler reads yet.</>,
          },
        ]}
        links={[
          { label: "IETF AI Preferences working group", href: "https://datatracker.ietf.org/wg/aipref/about/" },
          { label: "Cloudflare: managed robots.txt", href: "https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/" },
          { label: "Cloudflare: AI Crawl Control", href: "https://developers.cloudflare.com/ai-crawl-control/" },
        ]}
      />
    </div>
  );
}
