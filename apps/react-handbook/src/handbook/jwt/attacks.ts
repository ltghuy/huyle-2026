import type { AttackId, VerifyChecks } from "@/server/handbook/jwt/jwt.schema";

// What each attack does, the verifier mistake it exploits, the rule that
// stops it, and which single strict check blocks it.

export type AttackInfo = {
  title: string;
  story: string;
  mistake: string;
  rule: string;
  blockedBy: keyof VerifyChecks;
};

export const ATTACK_INFO: Record<AttackId, AttackInfo> = {
  "alg-none": {
    title: 'alg: "none"',
    story: 'Mallory writes her own payload with role "admin", sets the header to alg "none" and sends no signature at all.',
    mistake: "The verifier reads the algorithm from the token, and the JWS spec does define an unsigned \"none\" algorithm.",
    rule: 'Decide the algorithm on the server, per key. Never accept "none" for anything that grants access.',
    blockedBy: "pinAlg",
  },
  "key-confusion": {
    title: "RS256 → HS256 key confusion",
    story:
      "The API checks RS256 tokens with the issuer's RSA public key, which anyone can download. Mallory sets alg to HS256 and signs her admin payload with HMAC, using that public key's text as the shared secret.",
    mistake: 'A verifier called as verify(token, publicKey) lets the token choose: told "HS256", it runs HMAC with the public key as the secret, and the forgery matches.',
    rule: "Bind each key to one algorithm (from your key set, not the token) and reject a token whose alg doesn't match.",
    blockedBy: "pinAlg",
  },
  "embedded-jwk": {
    title: "Attacker's key in the header (jwk)",
    story: "Mallory generates her own key pair, signs an admin token with her private key and puts her public key in the header's jwk field.",
    mistake: 'The verifier uses the key the token brings ("here is how to check me"). Any signature is then valid. Same class: jku or x5u pointing at the attacker\'s URL.',
    rule: "Only trust keys from your own configuration or your issuer's key set URL, looked up by kid. Ignore keys inside the token.",
    blockedBy: "serverKeys",
  },
  expired: {
    title: "Replaying an expired token",
    story: "Mallory finds Alice's token in an old log file. It expired an hour ago, but the signature is still perfect.",
    mistake: "The verifier checks the signature and stops. A signature proves who issued a token, not that it is still valid.",
    rule: "Always check exp (and nbf), with a small leeway for clock skew of a few seconds, not minutes.",
    blockedBy: "exp",
  },
  "wrong-audience": {
    title: "A token for another API",
    story: "Alice's identity provider gave her a token for the billing app. Mallory, who runs that app, replays it against this API.",
    mistake: "Both apps trust the same issuer and keys, so the signature checks out. Nobody asked who the token was for.",
    rule: "Check that aud contains this API's own identifier, and give each API its own audience.",
    blockedBy: "aud",
  },
  "wrong-issuer": {
    title: "A token from another issuer",
    story: "A shared identity provider signs tokens for several tenants with the same keys. Mallory is admin in her own tenant and sends that token here.",
    mistake: "The key is trusted, so the verifier assumes the issuer is too.",
    rule: "Check iss exactly against the issuer you expect, and keep a separate key set per issuer.",
    blockedBy: "iss",
  },
};

export const CHECK_LABELS: Record<keyof VerifyChecks, { title: string; detail: string }> = {
  pinAlg: { title: "Pin the algorithm", detail: 'Use the alg registered for the key; refuse "none".' },
  serverKeys: { title: "Only the server's keys", detail: "Look up the key by kid; ignore jwk/jku in the header." },
  exp: { title: "Check exp and nbf", detail: "Reject expired and not-yet-valid tokens." },
  iss: { title: "Check the issuer", detail: "iss must be the expected issuer." },
  aud: { title: "Check the audience", detail: "aud must name this API." },
};
