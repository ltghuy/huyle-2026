import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { AnatomyDemo } from "./anatomy-demo";
import { AttacksDemo } from "./attacks-demo";
import { KeysDemo } from "./keys-demo";
import { LifecycleDemo } from "./lifecycle-demo";
import { StorageDemo } from "./storage-demo";

const RFC7519 = "https://www.rfc-editor.org/rfc/rfc7519";
const BCP = "https://www.rfc-editor.org/rfc/rfc8725"; // JWT best current practices
const OWASP = "https://cheatsheetseries.owasp.org/cheatsheets";
const MDN = "https://developer.mozilla.org/en-US/docs";

const TOPICS = [
  { id: "anatomy", title: "What a JWT is, and what signing proves" },
  { id: "attacks", title: "Verifier mistakes behind real attacks" },
  { id: "lifecycle", title: "Expiry, refresh and revocation" },
  { id: "storage", title: "Where to keep a token in the browser" },
  { id: "keys", title: "Keys, kid and rotation" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function JwtHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          A <strong>JSON Web Token</strong> is a signed statement a server hands to a client and later trusts because it recognises its
          own signature, without looking anything up. That makes JWTs convenient and easy to get wrong: anyone can read the token,
          and its safety depends on the verifier doing every check. The tokens below are signed by this site&apos;s server, the
          attacks run against a real verifier, and the storage demos run real scripts. It sits after{" "}
          <Link href={topicHref("origins-and-cors")} className={inline}>
            Origins, DNS and CORS
          </Link>
          .
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A signed JWT is three base64url parts joined by dots: <code>header.payload.signature</code>. The header and payload are just
            JSON anyone can read; the signature is the only part that needs a key, and it covers the first two parts exactly.
          </>
        }
        points={[
          <>
            <strong>Signed, not encrypted.</strong> The payload is public. Put an id and a few claims in it, never a password, card number or anything secret.
          </>,
          <>
            <strong>The signature authenticates, it doesn&apos;t hide.</strong> It proves the token was made by someone with the key and hasn&apos;t changed since. Change one character of the payload and it no longer matches.
          </>,
          <>
            <strong>HMAC vs public-key.</strong> <code>HS256</code> uses one shared secret, so every service that can verify can also forge; <code>RS256</code> and <code>ES256</code> sign with a private key and verify with a public one, so verifiers never hold signing power. <code>ES256</code> gives the same guarantee as <code>RS256</code> in a far smaller token.
          </>,
          <>
            <strong>Registered claims</strong> carry the rules: <code>iss</code>, <code>sub</code>, <code>aud</code>, <code>exp</code>, <code>nbf</code>, <code>iat</code>, <code>jti</code>. The header&apos;s <code>alg</code> and <code>kid</code> say how and with which key it was signed.
          </>,
        ]}
        demoTitle="issue a token, read it, tamper with it"
        demo={<AnatomyDemo />}
        advice={[
          {
            do: <>Treat the payload as public. Keep tokens small and pick <code>ES256</code> over <code>RS256</code> for new systems.</>,
            avoid: <>Storing anything secret or sensitive in the payload, or assuming base64url means it is hidden.</>,
          },
        ]}
        links={[
          { label: "RFC 7519: JWT", href: RFC7519 },
          { label: "jwt.io: anatomy", href: "https://jwt.io/introduction" },
          { label: "MDN: Base64", href: `${MDN}/Glossary/Base64` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Almost every real-world JWT incident comes from a verifier that trusted the token too much: it let the token pick its own
            algorithm or key, or it skipped a claim check. Here a naive verifier and a strict one face the same forged tokens.
          </>
        }
        points={[
          <>
            <strong>Pin the algorithm on the server.</strong> Never let the token&apos;s <code>alg</code> decide. This stops both <code>alg: none</code> and the classic RS256→HS256 key confusion, where a forger signs with the public key as an HMAC secret.
          </>,
          <>
            <strong>Only trust keys you configured.</strong> Ignore <code>jwk</code>, <code>jku</code> and <code>x5u</code> in the header; look the key up by <code>kid</code> in your own set.
          </>,
          <>
            <strong>Check the claims.</strong> The signature says nothing about <em>when</em> the token is valid or <em>who</em> it is for, so always verify <code>exp</code>/<code>nbf</code>, <code>iss</code> and <code>aud</code>. A correctly signed token meant for another API, or long expired, must still be rejected.
          </>,
          <>Turn the strict verifier&apos;s checks off one at a time in the demo: each attack is let through by exactly one missing check.</>,
        ]}
        demoTitle="run each attack past a naive and a strict verifier"
        demo={<AttacksDemo />}
        advice={[
          {
            do: <>Use a vetted library, pass it an explicit allow-list of algorithms, and verify <code>iss</code> and <code>aud</code> on every request.</>,
            avoid: <>Hand-rolling verification, calling <code>decode</code> where you meant <code>verify</code>, or passing a verifier a key without fixing the algorithm.</>,
          },
        ]}
        links={[
          { label: "RFC 8725: JWT best practices", href: BCP },
          { label: "OWASP: JWT cheat sheet", href: `${OWASP}/JSON_Web_Token_for_Java_Cheat_Sheet.html` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            A stateless token can&apos;t be called back, so the usual design is a <strong>short-lived access token</strong> (minutes) plus a
            long-lived <strong>refresh token</strong> that buys new ones. The hard parts are expiry, safe rotation of refresh tokens, and
            revoking access.
          </>
        }
        points={[
          <>
            <strong>Keep access tokens short.</strong> <code>exp</code> is the main defence for a token that can&apos;t be revoked. Allow a few seconds of <code>leeway</code> for clock skew, never minutes.
          </>,
          <>
            <strong>Rotate refresh tokens and detect reuse.</strong> Each refresh issues a new refresh token and retires the old one. If a retired one is ever presented again, treat it as theft and revoke the whole family. You can&apos;t tell the thief from the victim, so both are logged out.
          </>,
          <>
            <strong>Refresh tokens needn&apos;t be JWTs.</strong> An opaque random string stored server-side (as a hash) is easy to revoke and reveals nothing.
          </>,
          <>
            <strong>Revocation needs state.</strong> To cut a valid access token off before <code>exp</code> you need a <em>deny-list</em> of token ids or a per-user <em>token version</em> checked on each request. With neither, a stolen access token works until it expires, which is why access tokens are kept short.
          </>,
        ]}
        demoTitle="sign in, let it expire, refresh, and replay a stolen token"
        demo={<LifecycleDemo />}
        advice={[
          {
            do: <>Short access tokens, rotating refresh tokens with reuse detection, and a revocation mechanism for the paths that need it.</>,
            avoid: <>Long-lived access tokens, reusing a refresh token, or assuming &quot;log out&quot; invalidates a JWT already in someone&apos;s hands.</>,
          },
        ]}
        links={[
          { label: "RFC 8725 §3.2-3.3", href: BCP },
          { label: "OWASP: session management", href: `${OWASP}/Session_Management_Cheat_Sheet.html` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Where a token lives in the browser decides who can steal it. The trade-off is between <strong>XSS</strong> (a script
            running in your page) and <strong>CSRF</strong> (another site making requests as you), and each storage choice trades one
            risk for the other.
          </>
        }
        points={[
          <>
            <strong><code>localStorage</code> / <code>sessionStorage</code>:</strong> any script on the page reads them, so an XSS bug exfiltrates the token outright. No cookie means no CSRF, but this is the worst exposure to XSS of any option.
          </>,
          <>
            <strong>An <code>HttpOnly</code> cookie</strong> can&apos;t be read by JavaScript, so XSS can&apos;t steal the token. The browser attaches it automatically, though, so you need <code>SameSite</code> (and CSRF defences) to control cross-site sends. XSS is still game over here: a script can still <em>make</em> authenticated requests, it just can&apos;t take the token away.
          </>,
          <>
            <strong>In memory</strong> (a variable, not storage) is lost on reload and can&apos;t be read directly by XSS, but a script can still patch <code>fetch</code> and ride along on the next call. Nothing in the page resists a script running <em>in</em> the page, which is why{" "}
            <Link href={topicHref("xss-csp-csrf")} className={inline}>
              stopping XSS
            </Link>{" "}
            comes first.
          </>,
          <>
            <strong>Sessions and the BFF.</strong> A plain server session (an opaque <code>HttpOnly</code> cookie, state on the server) is often the simplest safe choice for a first-party web app. A <strong>backend-for-frontend</strong> keeps the real tokens on the server and gives the browser only a session cookie, so the browser never holds a JWT at all.
          </>,
        ]}
        demoTitle="store a token, then run an injected script and a cross-site request"
        demo={<StorageDemo />}
        advice={[
          {
            do: <>For a first-party app, prefer a server session or a BFF with an <code>HttpOnly</code>, <code>SameSite</code> cookie. Whatever you choose, stop XSS first, because it defeats every option.</>,
            avoid: <>Putting a long-lived token in <code>localStorage</code> and treating the storage question as a substitute for a Content-Security-Policy.</>,
          },
        ]}
        links={[
          { label: "OWASP: XSS prevention", href: `${OWASP}/Cross_Site_Scripting_Prevention_Cheat_Sheet.html` },
          { label: "MDN: SameSite cookies", href: `${MDN}/Web/HTTP/Reference/Headers/Set-Cookie/SameSite` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            An issuer publishes its public keys as a key set (JWKS) and names the signing key in each token&apos;s{" "}
            <code>kid</code>. That lets verifiers find the right key, and lets the issuer rotate keys without downtime.
          </>
        }
        points={[
          <>
            <strong>Publish only public keys.</strong> A JWKS lists each key&apos;s public parts, its <code>kid</code> and its algorithm, never any private material.
          </>,
          <>
            <strong>Rotate by overlap.</strong> Add a new key and publish it; switch signing to it; keep verifying the old key until every token it signed has expired; then retire it. A token signed by a retired key fails with &quot;unknown key id&quot;.
          </>,
          <>
            <strong>Verify by <code>kid</code>, pinned to that key&apos;s algorithm.</strong> It is the same rule as in the attacks topic: the key set, not the token, decides which algorithm is acceptable.
          </>,
        ]}
        demoTitle="rotate the signing key and verify old and new tokens"
        demo={<KeysDemo />}
        advice={[
          {
            do: <>Serve a JWKS, cache it with the key&apos;s <code>kid</code>, and overlap old and new keys across a full token lifetime when rotating.</>,
            avoid: <>Hard-coding one key, rotating without an overlap window, or trusting a <code>jku</code> URL from inside the token.</>,
          },
        ]}
        links={[
          { label: "RFC 7517: JWK & JWKS", href: "https://www.rfc-editor.org/rfc/rfc7517" },
          { label: "RFC 7518: algorithms", href: "https://www.rfc-editor.org/rfc/rfc7518" },
        ]}
      />
    </div>
  );
}
