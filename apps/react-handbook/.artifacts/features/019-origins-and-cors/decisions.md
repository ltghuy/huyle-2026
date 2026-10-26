---
id: "019"
feature: origins-and-cors
created: 2026-10-08
---

# Decisions: Origins, DNS and CORS

The user asked to "also introduce host, DNS, origin, CORS...". Settled with defaults.

## Resolved

### New page or part of Networking

- **Decision:** a second page in Browser & Web Platform, "Origins, DNS and CORS".
- **Rationale:** the Networking page is about moving bytes; this one is about names and trust boundaries. Each stays short.

### Real DNS lookups

- **Question:** browsers can't query DNS; third-party DNS-over-HTTPS would send the learner's input elsewhere.
- **Decision:** the lookup runs on this site's server with its own resolver; the resolver chain is shown as a labelled illustration.
- **Rationale:** real records, no third party; the chain itself can't be observed from a stub resolver.

### A real second origin anywhere

- **Question:** a cross-origin request needs another origin, also when deployed.
- **Decision:** the request is sent from a sandboxed iframe without `allow-same-origin`: its origin is opaque (`null`), so its requests to this site are real cross-origin requests, with real preflights, on any host.
- **Rationale:** no second server or domain needed; the policy and the log live in one API route.
- **Caveats:** the allowed origin "that origin" means `null` here; the notes say never to allow `null` in production.

### Site calculation

- **Decision:** site = scheme + registrable domain, computed with a short built-in list of multi-label public suffixes (co.uk, com.au, github.io, vercel.app, …), labelled simplified.
