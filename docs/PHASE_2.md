# Phase 2 priorities

1. Re-verify current provider terms and complete one approved live vertical slice, starting with the provider that can legitimately expose both listing and seller evidence. Add signed data-access decision records.
2. Move providers, credentials, validation, caching, rate limits, and scoring to a server deployment. Keep the browser client free of secrets.
3. Apply the Prisma schema to PostgreSQL with mode-scoped constraints, immutable source records, migrations, retention jobs, and audit trails.
4. Implement catalog ingestion and an identity-resolution review queue. Start with exact set/card number/language/variant mapping; do not auto-merge ambiguous records.
5. Implement background listing and sales refresh, provider-specific budgets, idempotency, retries with jitter, and circuit breakers.
6. Add licensed card imagery, certification verification, and population evidence only where terms permit.
7. Expand seller-review analysis with evidence snippets and cautious theme summaries; never auto-label a seller as fraudulent.
8. Add authentication, saved searches, alerts, freshness indicators, accessibility audits, observability, and production incident controls.
9. Add provider contract fixtures, database integration tests, API abuse tests, Playwright browser tests, and live-provider sandbox tests before enabling `LIVE`.

