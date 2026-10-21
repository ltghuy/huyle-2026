import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { CorsDemo } from "./cors-demo";
import { DnsDemo } from "./dns-demo";
import { OriginDemo } from "./origin-demo";
import { UrlDemo } from "./url-demo";

const MDN = "https://developer.mozilla.org/en-US/docs";

const TOPICS = [
  { id: "urls-and-hosts", title: "URLs, hosts and domains" },
  { id: "dns", title: "DNS: from a name to an address" },
  { id: "origins", title: "Origins, sites and the same-origin policy" },
  { id: "cors", title: "CORS: letting other origins read a response" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function OriginsHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          The browser decides what a page may do by where it came from. A URL names a host, DNS turns the host into an address, and
          the scheme, host and port together form the page&apos;s origin. The browser keeps origins apart unless a server explicitly
          shares with another one through CORS. The DNS lookups and cross-origin requests in the demos are real. This topic follows{" "}
          <Link href={topicHref("networking")} className={inline}>
            Networking
          </Link>
          .
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A URL is an address with fixed parts: <code>scheme://user@host:port/path?query#fragment</code>. Many bugs come from mixing
            up the words for its middle.
          </>
        }
        points={[
          <><strong>Hostname</strong> is the name (<code>shop.example.com</code>); <strong>host</strong> adds the port when one is written (<code>shop.example.com:8443</code>); the browser sends it in the <code>Host</code> header so one server can serve many sites.</>,
          <><strong>Domain names</strong> read right to left: top-level domain (<code>.com</code>, <code>.uk</code>), the registered name (<code>example</code>), then any subdomains (<code>shop.</code>). The <strong>public suffix</strong> is the part anyone can register under (<code>com</code>, <code>co.uk</code>, <code>github.io</code>).</>,
          <>The <strong>port</strong> picks the program on the machine; 443 for https and 80 for http are implied when not written.</>,
          <>The <strong>fragment</strong> (<code>#…</code>) stays in the browser and is never sent. Build URLs with <code>new URL()</code> and <code>URLSearchParams</code> so values are encoded correctly.</>,
        ]}
        demoTitle="take a URL apart"
        demo={<UrlDemo />}
        advice={[
          {
            do: <>Parse and build URLs with <code>new URL(path, base)</code> and <code>url.searchParams.set()</code>.</>,
            avoid: "Concatenating strings or splitting on \"/\" and \"?\": encoding and edge cases break.",
          },
        ]}
        links={[
          { label: "MDN: What is a URL?", href: `${MDN}/Learn_web_development/Howto/Web_mechanics/What_is_a_URL` },
          { label: "MDN: What is a domain name?", href: `${MDN}/Learn_web_development/Howto/Web_mechanics/What_is_a_domain_name` },
          { label: "MDN: URL API", href: `${MDN}/Web/API/URL` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Computers connect to IP addresses, not names. The <strong>Domain Name System</strong> is a distributed, cached directory
            that answers &quot;what is the address of this name?&quot;, usually in a few milliseconds because someone nearby already
            asked.
          </>
        }
        points={[
          <>Your device asks a <strong>recursive resolver</strong> (from your ISP, or 1.1.1.1, 8.8.8.8). If it hasn&apos;t cached the answer, it asks a root server, then the top-level domain&apos;s servers, then the domain&apos;s own <strong>authoritative</strong> name servers.</>,
          <>Record types: <code>A</code> / <code>AAAA</code> (IPv4 / IPv6 address), <code>CNAME</code> (an alias for another name, common with CDNs), <code>MX</code> (mail), <code>TXT</code> (verification, SPF), <code>NS</code> (who is authoritative).</>,
          <>Every record has a <strong>TTL</strong>: how many seconds caches may keep it. Lower it before moving servers, or old addresses linger.</>,
          <>A lookup is the first round trip of a new origin; <code>dns-prefetch</code> and <code>preconnect</code> start it early. DNS over HTTPS hides your lookups from the network.</>,
        ]}
        demoTitle="look up a real name"
        demo={<DnsDemo />}
        advice={[
          {
            do: "Keep critical files on few origins and use a DNS provider with servers near your users.",
            avoid: "Changing a record with a long TTL and expecting everyone to see it at once.",
          },
        ]}
        links={[
          { label: "MDN: DNS", href: `${MDN}/Glossary/DNS` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            An <strong>origin</strong> is scheme + host + port: <code>https://shop.example.com</code> and{" "}
            <code>https://shop.example.com:8443</code> are different origins. The <strong>same-origin policy</strong> keeps a page from
            reading anything that belongs to another origin.
          </>
        }
        points={[
          <>Without it, any site you visit could read your webmail through your logged-in cookies. So the browser lets a page <em>send</em> requests and <em>embed</em> other origins (images, scripts, iframes, form posts), but not <em>read</em> their responses or DOM.</>,
          <>A <strong>site</strong> is looser: scheme + registrable domain (<code>https://example.com</code> covers <code>app.</code> and <code>api.</code>). Cookies are scoped by site and domain, not origin; <code>SameSite=Lax</code> or <code>Strict</code> keeps them off cross-site requests, which blocks most CSRF.</>,
          <>Windows of different origins talk with <code>postMessage</code>, always checking <code>event.origin</code>.</>,
          <>Local development has the same rules: <code>localhost:3000</code> and <code>localhost:4000</code> are different origins.</>,
        ]}
        demoTitle="compare two URLs"
        demo={<OriginDemo />}
        advice={[
          {
            do: "Serve the frontend and its API from the same origin (or a proxy path like /api) when you can: no CORS needed.",
            avoid: "Assuming subdomains are \"the same\": app.example.com can't read api.example.com without CORS.",
          },
        ]}
        links={[
          { label: "MDN: Same-origin policy", href: `${MDN}/Web/Security/Defenses/Same-origin_policy` },
          { label: "web.dev: Same-site and same-origin", href: "https://web.dev/articles/same-site-same-origin" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            <strong>Cross-Origin Resource Sharing</strong> is how a server tells the browser &quot;this other origin may read my
            response&quot;. It loosens the same-origin policy; it is not a security feature for the server, and a CORS error is the
            browser protecting the user.
          </>
        }
        points={[
          <>The browser adds an <code>Origin</code> header; the server answers with <code>Access-Control-Allow-Origin</code> naming that origin (or <code>*</code>). No match: the response is hidden from the page, but the request was still sent and handled.</>,
          <><strong>Simple requests</strong> (GET, HEAD, POST with a form or text body and no custom headers) go straight out. Anything else first sends a <strong>preflight</strong>: an <code>OPTIONS</code> request asking about the method and headers, answered with <code>Access-Control-Allow-Methods</code> / <code>-Headers</code>; <code>Access-Control-Max-Age</code> caches the answer.</>,
          <><strong>Credentials</strong> (cookies, auth) need <code>credentials: &quot;include&quot;</code> on the request and <code>Access-Control-Allow-Credentials: true</code> plus the exact origin (never <code>*</code>) on the response.</>,
          <>Fix CORS on the server (or with a same-origin proxy), not in the browser: <code>mode: &quot;no-cors&quot;</code> only gives you an unreadable, opaque response.</>,
        ]}
        demoTitle="send a real cross-origin request"
        demo={<CorsDemo />}
        advice={[
          {
            do: "Keep an allow-list of origins on the server, echo the matching one, and send Vary: Origin.",
            avoid: <>Reflecting any <code>Origin</code> with credentials allowed, or allowing <code>null</code> (sandboxed and file pages send it): every site could then read your users&apos; data.</>,
          },
        ]}
        links={[
          { label: "MDN: CORS", href: `${MDN}/Web/HTTP/Guides/CORS` },
          { label: "MDN: Preflight request", href: `${MDN}/Glossary/Preflight_request` },
          { label: "web.dev: Cross-origin resource sharing", href: "https://web.dev/articles/cross-origin-resource-sharing" },
        ]}
      />
    </div>
  );
}
