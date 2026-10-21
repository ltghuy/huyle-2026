import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { CspDemo } from "./csp-demo";
import { CsrfDemo } from "./csrf-demo";
import { XssDemo } from "./xss-demo";

const OWASP = "https://cheatsheetseries.owasp.org/cheatsheets";
const MDN = "https://developer.mozilla.org/en-US/docs";

const TOPICS = [
  { id: "xss", title: "XSS: when content becomes script" },
  { id: "csp", title: "CSP: a second wall" },
  { id: "csrf", title: "CSRF: a request made as you" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function WebAttacksHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          Three attacks sit at the centre of frontend security. <strong>XSS</strong> runs the attacker&apos;s script in your page;{" "}
          <strong>CSP</strong> is the browser-enforced wall that limits the damage when it slips through; and <strong>CSRF</strong> makes
          the browser send a request as the logged-in user. They connect: XSS defeats almost every other defence, CSP is how you contain
          it, and CSRF is the cookie-session counterpart to{" "}
          <Link href={topicHref("jwt")} className={inline}>
            where you keep a token
          </Link>
          . The attacks in the demos run for real, inside a sandbox that can&apos;t touch this page.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            Cross-site scripting is an <strong>output-encoding bug</strong>: untrusted data is written into a page in a place where the
            browser reads it as code instead of text. Filtering the input never fixes it: encode every value for the exact
            context it lands in.
          </>
        }
        points={[
          <>
            The context decides the danger. The same string is harmless as a text node, dangerous inside <code>innerHTML</code>, dangerous again when it breaks out of an attribute, and dangerous as a <code>javascript:</code> URL. Each context needs its own encoding.
          </>,
          <>
            XSS comes in three shapes: <em>stored</em> (the payload is saved and served to everyone), <em>reflected</em> (bounced back from a URL or form), and <em>DOM-based</em> (client code writes untrusted data into a sink). All three have the same root cause.
          </>,
          <>
            Frameworks escape by default until you opt out. React escapes text in JSX, but <code>dangerouslySetInnerHTML</code>, an unchecked <code>href</code>, or injecting into markup it doesn&apos;t own all reopen the hole. <code>innerHTML</code> won&apos;t run a late <code>&lt;script&gt;</code>, but it will run an <code>&lt;img onerror&gt;</code>.
          </>,
          <>
            Once a script runs in your page, it can read tokens, call your API as the user, and rewrite the page. That is why the token page kept saying to stop XSS first.
          </>,
        ]}
        demoTitle="inject through different sinks, then encode"
        demo={<XssDemo />}
        advice={[
          {
            do: <>Let the framework escape; encode per context for the rest; validate URL schemes; keep untrusted HTML out, or sanitize it with a vetted library.</>,
            avoid: <>Building HTML by string concatenation, trusting a &quot;sanitized&quot; input once, or putting untrusted data in a <code>&lt;script&gt;</code>, a style, or an event handler.</>,
          },
        ]}
        links={[
          { label: "OWASP: XSS prevention", href: `${OWASP}/Cross_Site_Scripting_Prevention_Cheat_Sheet.html` },
          { label: "OWASP: DOM-based XSS", href: `${OWASP}/DOM_based_XSS_Prevention_Cheat_Sheet.html` },
          { label: "MDN: Trusted Types", href: `${MDN}/Web/API/Trusted_Types_API` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            A <strong>Content-Security-Policy</strong> is an HTTP header that tells the browser which sources of script, style, images and
            more it may load, and the browser enforces it. It&apos;s the main defence-in-depth for XSS: even if a payload lands, a good
            policy stops it executing.
          </>
        }
        points={[
          <>
            Each directive is an allowlist: <code>script-src</code>, <code>img-src</code>, <code>default-src</code> and the rest each say what that kind of resource may come from. Start from <code>default-src &apos;none&apos;</code> and open only what you need.
          </>,
          <>
            <code>&apos;unsafe-inline&apos;</code> allows every inline script, which defeats the point. A per-response <code>nonce</code> (or a hash of the script) allows only the scripts you marked, so nonces and hashes are the better choice. If a nonce or hash is present, the browser ignores <code>&apos;unsafe-inline&apos;</code>.
          </>,
          <>
            <code>strict-dynamic</code> lets a trusted (nonced) script load more scripts without maintaining host allowlists. This is the currently recommended shape, with a nonce as the anchor.
          </>,
          <>
            Start in report-only mode: <code>Content-Security-Policy-Report-Only</code> reports violations without blocking, so you can tighten a policy on a live site safely. CSP is a second wall; you still need encoding.
          </>,
        ]}
        demoTitle="build a policy and watch it block"
        demo={<CspDemo />}
        advice={[
          {
            do: <>Serve a nonce-based <code>script-src</code> with <code>strict-dynamic</code>, roll out in report-only, and keep <code>default-src &apos;none&apos;</code>.</>,
            avoid: <>Shipping <code>&apos;unsafe-inline&apos;</code>, treating CSP as your only XSS defence, or an allowlist so broad it permits an attacker-controlled host.</>,
          },
        ]}
        links={[
          { label: "MDN: CSP", href: `${MDN}/Web/HTTP/Guides/CSP` },
          { label: "OWASP: CSP cheat sheet", href: `${OWASP}/Content_Security_Policy_Cheat_Sheet.html` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Cross-site request forgery abuses the fact that the browser attaches your cookies to a request automatically,
            wherever it comes from. Another site can make your browser POST to an app you&apos;re logged into, and the server, seeing a valid
            session cookie, acts on it.
          </>
        }
        points={[
          <>
            CSRF rides on ambient credentials. The attacker never sees your cookie; they cause a request, and the browser adds the cookie. So CSRF targets cookie sessions, and tokens a script must add by hand are out of its reach.
          </>,
          <>
            <code>SameSite</code>, and now third-party-cookie blocking, are the first line of defence. <code>Lax</code> (today&apos;s default) and <code>Strict</code> keep the cookie off cross-site requests, and modern browsers increasingly block third-party cookies outright, so the classic cross-site attack often fails before it starts. It is not a complete defence: <code>Lax</code> still allows top-level GET navigations, a <em>same-site</em> subdomain can still send the cookie, and older clients don&apos;t enforce it.
          </>,
          <>
            The next defence is something the attacker can&apos;t guess or send: a synchronizer token in the form body, or a custom header the server requires. A cross-site <code>&lt;form&gt;</code> can&apos;t set a custom header, and a cross-site <code>fetch</code> can only after the server opts in through CORS.
          </>,
          <>
            A bearer token sidesteps classic CSRF. A JWT in an <code>Authorization</code> header is added by your code, not the browser, so a forged cross-site request arrives without it. The trade-off is that you are back to the XSS risk of storing it.
          </>,
        ]}
        demoTitle="forge a request from another site, then defend"
        demo={<CsrfDemo />}
        advice={[
          {
            do: <>Use <code>SameSite=Lax</code> (or <code>Strict</code>) cookies and a CSRF token for state-changing requests; require a custom header for JSON APIs.</>,
            avoid: <>Relying on <code>SameSite</code> alone, performing state changes on GET, or assuming an API is safe because it only accepts JSON.</>,
          },
        ]}
        links={[
          { label: "OWASP: CSRF prevention", href: `${OWASP}/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html` },
          { label: "MDN: SameSite cookies", href: `${MDN}/Web/HTTP/Reference/Headers/Set-Cookie/SameSite` },
        ]}
      />
    </div>
  );
}
