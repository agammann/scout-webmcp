# Security policy

## Supported code

Security fixes target the current default branch. Phase 1 contains no authentication, write API, payment flow, production database, or live marketplace credentials.

## Reporting

Do not publish suspected vulnerabilities with secrets or personal data. Report the affected version, reproducible steps, impact, and a minimal proof of concept privately to the repository owner.

## Required controls

- Secrets are server-only and never use a `VITE_` prefix.
- Provider payloads and user inputs are untrusted and schema validated.
- Future URL fetches use HTTPS host allowlists, DNS/IP checks, redirect revalidation, response-size limits, and short timeouts.
- Future database access uses parameterized Prisma queries and a least-privilege application role.
- APIs require request-size limits, per-IP/user rate limits, cache budgets, and non-sensitive structured logs.
- Provider failures return safe errors without credentials, auth headers, internal stack traces, or raw upstream bodies.
- CSP, secure headers, dependency pinning, automated auditing, and provenance/mode isolation are release gates.

## Phase 1 boundaries

All data is local, synthetic, read-only, and shipped with the client. This is safe for judging but is not a live-data deployment architecture. Phase 2 moves ingestion, secrets, persistence, and live adapters behind a server boundary before real records are enabled.

