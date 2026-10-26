---
id: "018"
feature: networking-handbook
created: 2026-10-08
---

# Decisions: Networking Handbook

The user asked for a sub page in Browser & Web Platform introducing "HTTP/HTTPS,
TCP..". No reference course was given. Gray areas were settled with defaults.

## Resolved

### Which topics

- **Question:** "HTTP/HTTPS, TCP.." leaves the list open.
- **Decision:** six topics: the journey of a request (URL, DNS, TCP, TLS, HTTP); TCP (with UDP for contrast); HTTP messages (methods, status codes, headers); HTTP caching; HTTP/1.1, /2 and /3; HTTPS and TLS.
- **Rationale:** these are the networking ideas a frontend developer needs to explain and debug loading; caching sits here because it is part of HTTP.
- **Caveats:** CORS and cookies are left to a later security page.

### Page name and section shape

- **Question:** one page per protocol, or one page?
- **Decision:** one page, "Networking", the only page listed in the folder for now.
- **Rationale:** the user asked for one sub page; future pages (rendering, storage, security) are added when written, not listed as placeholders.

### Real vs simulated

- **Question:** the browser can't show packets, handshakes or loss.
- **Decision:** round trips, slow start and version waterfalls are deterministic models labelled simulated; HTTP messages and caching use real requests to this site's own API route; protocol and secure-context facts are read from the browser.
- **Rationale:** same rule as the Performance page: measured where the browser allows it, labelled where it doesn't.

### Reference reading

- **Decision:** link MDN (HTTP overview, caching, status codes, TLS) and web.dev (HTTP caching, HTTPS) per topic.
