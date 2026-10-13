import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { CacheDemo } from "./cache-demo";
import { HttpDemo } from "./http-demo";
import { HttpsDemo } from "./https-demo";
import { JourneyDemo } from "./journey-demo";
import { SlowStartDemo } from "./slow-start-demo";
import { VersionsDemo } from "./versions-demo";

const MDN = "https://developer.mozilla.org/en-US/docs";

const TOPICS = [
  { id: "how-a-request-travels", title: "How a request travels" },
  { id: "tcp", title: "TCP: reliable, ordered delivery" },
  { id: "http-messages", title: "HTTP messages: methods, status codes, headers" },
  { id: "http-caching", title: "HTTP caching" },
  { id: "http-versions", title: "HTTP/1.1, HTTP/2 and HTTP/3" },
  { id: "https", title: "HTTPS and TLS" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const LINKS_LABEL = "Read more:";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: LINKS_LABEL };
}

export function NetworkingHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          Every page, script, image and API call is a conversation over the network. The protocols are layered:{" "}
          <strong>IP</strong> moves packets between machines, <strong>TCP</strong> (or <strong>QUIC</strong> over UDP) turns them into a
          reliable stream, <strong>TLS</strong> encrypts that stream, and <strong>HTTP</strong> is the request-and-response language on
          top. Knowing what each layer costs explains most of what you see in the DevTools Network panel. Each topic below has a demo;
          some send real requests to this site.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            Before the first byte of a page arrives, the browser has to find the server and agree how to talk to it. Each step is a{" "}
            <strong>round trip</strong> (RTT): a message there and an answer back, bound by distance and the speed of light, not bandwidth.
          </>
        }
        points={[
          <>
            Parse the URL, then <strong>DNS</strong> turns the host name into an IP address (cached by the browser, the OS and resolvers; see{" "}
            <Link href={topicHref("origins-and-cors")} className={inline}>
              Origins, DNS and CORS
            </Link>
            ).
          </>,
          <><strong>TCP handshake</strong> (SYN, SYN-ACK, ACK): one round trip to open a connection.</>,
          <><strong>TLS handshake</strong> for HTTPS: one round trip with TLS 1.3, two with TLS 1.2. HTTP/3 merges transport and TLS into one.</>,
          <>Then the <strong>HTTP request</strong>: one more round trip plus the server&apos;s time. That total is the Time to First Byte.</>,
          <>A reused (kept-alive) connection skips everything but the request, which is why browsers keep connections open and why <code>preconnect</code> helps.</>,
        ]}
        demoTitle="count the round trips to the first byte (simulated)"
        demo={<JourneyDemo />}
        advice={[
          {
            do: <>Serve from a CDN close to users and enable TLS 1.3 and HTTP/3; <code>preconnect</code> to the few other origins you need early.</>,
            avoid: "Spreading critical files over many domains: each new origin costs DNS, TCP and TLS again.",
          },
        ]}
        links={[
          { label: "MDN: How browsers work", href: `${MDN}/Web/Performance/Guides/How_browsers_work` },
          { label: "MDN: Overview of HTTP", href: `${MDN}/Web/HTTP/Guides/Overview` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            IP only does its best: packets can be lost, duplicated or arrive out of order. TCP numbers every byte, waits for
            acknowledgements, resends what is missing and hands the data over in order. <strong>UDP</strong> skips all of that: it has no
            connection and no guarantees, and so less delay.
          </>
        }
        points={[
          <><strong>Slow start</strong>: a new connection may send only about 10 packets (~14 KB) before waiting for an acknowledgement, then doubles each round trip. Small first responses arrive fastest.</>,
          <><strong>Loss</strong> is read as congestion: the window is cut in half and grows slowly again, so a lossy network hurts far more than its loss rate suggests.</>,
          <><strong>Head-of-line blocking</strong>: because data is delivered in order, one lost packet holds back everything after it until it is resent.</>,
          <>UDP suits live audio and video, games and DNS, where late data is useless; QUIC builds its own reliability on UDP so it can avoid TCP&apos;s limits.</>,
        ]}
        demoTitle="download a file through slow start (simulated)"
        demo={<SlowStartDemo />}
        advice={[
          {
            do: "Keep the critical HTML and CSS small enough to arrive in the first few round trips (the first ~14 KB matter most).",
            avoid: "Opening many fresh connections for small files: each starts slow again.",
          },
        ]}
        links={[
          { label: "MDN: TCP", href: `${MDN}/Glossary/TCP` },
          { label: "MDN: TCP slow start", href: `${MDN}/Glossary/TCP_slow_start` },
          { label: "MDN: Head-of-line blocking", href: `${MDN}/Glossary/Head_of_line_blocking` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            HTTP is a text-shaped conversation: a <strong>request</strong> (method, path, headers, optional body) and a{" "}
            <strong>response</strong> (status code, headers, optional body). It is stateless: every request carries what the server needs,
            usually including a cookie or token.
          </>
        }
        points={[
          <><strong>Methods</strong>: <code>GET</code> reads (safe, cacheable), <code>POST</code> creates or acts, <code>PUT</code> replaces, <code>PATCH</code> changes part, <code>DELETE</code> removes. GET, PUT and DELETE are idempotent: repeating them has the same effect, so they can be retried.</>,
          <><strong>Status codes</strong>: 2xx success, 3xx redirect or cached, 4xx the client&apos;s fault, 5xx the server&apos;s. Return the precise one: 201 with a <code>Location</code>, 401 vs 403, 404, 429 with <code>Retry-After</code>.</>,
          <><strong>Headers</strong> carry the metadata: <code>Content-Type</code>, <code>Accept</code>, <code>Authorization</code>, <code>Cache-Control</code>, <code>Set-Cookie</code>, CORS headers.</>,
          <><code>fetch()</code> only rejects on network failure; a 404 or 500 still resolves, so check <code>response.ok</code>. It follows redirects for you.</>,
        ]}
        demoTitle="send a real request and read the exchange"
        demo={<HttpDemo />}
        advice={[
          {
            do: <>Check <code>response.ok</code> and the status, and show the user a specific message (see <Link href={practiceHref("data-fetching-hook")} className={inline}>practice 4, Data Fetching Hook</Link>).</>,
            avoid: "Answering 200 with { \"error\": … } in the body: caches, retries and monitoring all read the status code.",
          },
        ]}
        links={[
          { label: "MDN: HTTP messages", href: `${MDN}/Web/HTTP/Guides/Messages` },
          { label: "MDN: Methods", href: `${MDN}/Web/HTTP/Reference/Methods` },
          { label: "MDN: Status codes", href: `${MDN}/Web/HTTP/Reference/Status` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            With <code>Cache-Control</code> the server says how long a response stays <strong>fresh</strong>, and while it is fresh the
            browser reuses it without sending a request. After that the browser <strong>revalidates</strong> it cheaply instead of
            downloading it again.
          </>
        }
        points={[
          <><code>max-age=N</code>: reuse without asking for N seconds. <code>no-cache</code>: may store, but must check first. <code>no-store</code>: never store (private data). <code>private</code> keeps it out of shared caches like CDNs.</>,
          <>Revalidation: the response carries an <code>ETag</code> (or <code>Last-Modified</code>); the browser asks with <code>If-None-Match</code>, and 304 Not Modified means &quot;keep your copy&quot;, with no body.</>,
          <>The usual pattern: hashed file names (<code>app.3f9c.js</code>) with <code>max-age=31536000, immutable</code>, and HTML with <code>no-cache</code> so a deploy is picked up at once.</>,
          <>Scripts can&apos;t see a 304: <code>fetch()</code> reports the cached 200. DevTools shows &quot;(disk cache)&quot; or 304.</>,
        ]}
        demoTitle="fetch the same resource under three caching rules"
        demo={<CacheDemo />}
        advice={[
          {
            do: "Give every response an explicit Cache-Control; long-lived for hashed assets, revalidated for HTML and API data.",
            avoid: "Leaving caching to defaults: browsers guess a freshness lifetime from Last-Modified (heuristic caching).",
          },
        ]}
        links={[
          { label: "MDN: HTTP caching", href: `${MDN}/Web/HTTP/Guides/Caching` },
          { label: "web.dev: HTTP cache", href: "https://web.dev/articles/http-cache" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            The meaning of HTTP hasn&apos;t changed since HTTP/1.1; what changed is how messages travel. Each version fixes the bottleneck of
            the one before.
          </>
        }
        points={[
          <><strong>HTTP/1.1</strong>: text messages, one request at a time per connection. Browsers open up to 6 connections per host, which is why bundling and domain sharding were invented.</>,
          <><strong>HTTP/2</strong>: binary frames, many requests at once (<strong>multiplexing</strong>) on one connection, compressed headers (HPACK). But it still rides on TCP, so one lost packet stalls every stream.</>,
          <><strong>HTTP/3</strong>: runs on QUIC over UDP. Streams are independent, the handshake includes TLS, and connections survive a network change (Wi-Fi to mobile).</>,
          <>With HTTP/2 and later, many small files are cheap again; bundle for caching and compression, not to save connections.</>,
        ]}
        demoTitle="load twelve files with each version (simulated)"
        demo={<VersionsDemo />}
        advice={[
          {
            do: "Enable HTTP/2 and HTTP/3 on your server or CDN, and serve the page and its files from as few origins as possible.",
            avoid: "Domain sharding under HTTP/2: extra connections defeat multiplexing and header compression.",
          },
        ]}
        links={[
          { label: "MDN: HTTP/2", href: `${MDN}/Glossary/HTTP_2` },
          { label: "MDN: HTTP/3", href: `${MDN}/Glossary/HTTP_3` },
        ]}
      />

      <Topic
        {...topic(5)}
        intro={
          <>
            HTTPS is HTTP inside TLS. It gives three guarantees: <strong>confidentiality</strong> (nobody on the path can
            read it), <strong>integrity</strong> (nobody can change it unnoticed) and <strong>authenticity</strong> (you are talking to the
            real site).
          </>
        }
        points={[
          <>The server proves its identity with a <strong>certificate</strong> signed by a certificate authority your system trusts; the browser checks the name, the dates and the chain.</>,
          <>The handshake agrees on fresh keys (forward secrecy): even a later key leak can&apos;t decrypt today&apos;s traffic.</>,
          <><strong>HSTS</strong> (<code>Strict-Transport-Security</code>) makes the browser use HTTPS for the site from then on, so the first insecure redirect can&apos;t be attacked.</>,
          <>Browsers block <strong>mixed content</strong> (HTTP files on an HTTPS page) and keep powerful features (service workers, geolocation, the clipboard, passkeys) to <strong>secure contexts</strong>. HTTP/2 and HTTP/3 are only used over HTTPS.</>,
        ]}
        demoTitle="what someone on the same network can read"
        demo={<HttpsDemo />}
        advice={[
          {
            do: <>Serve everything over HTTPS, redirect HTTP once, and send HSTS; mark cookies <code>Secure</code>, <code>HttpOnly</code> and <code>SameSite</code>.</>,
            avoid: "Thinking HTTPS hides everything: the IP addresses, the host name and the size of the traffic still show.",
          },
        ]}
        links={[
          { label: "MDN: TLS", href: `${MDN}/Web/Security/Defenses/Transport_Layer_Security` },
          { label: "MDN: Secure contexts", href: `${MDN}/Web/Security/Defenses/Secure_Contexts` },
          { label: "MDN: HSTS", href: `${MDN}/Web/HTTP/Reference/Headers/Strict-Transport-Security` },
          { label: "web.dev: Why HTTPS matters", href: "https://web.dev/articles/why-https-matters" },
        ]}
      />

      <p className="max-w-3xl text-sm text-foreground/85">
        Next: how these requests turn into a fast page in{" "}
        <Link href={topicHref("performance")} className={inline}>
          Performance
        </Link>
        .
      </p>
    </div>
  );
}
