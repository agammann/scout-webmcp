# Contributing

Read [AGENTS.md](AGENTS.md) for the engineering contract. Keep the fictional-data boundary, exact card/tier identity, deterministic scoring and one shared service for the UI and six tools. Preserve methodology and provenance in every tool result.

Use Node.js 24+ and pnpm 11.19.0. Run frozen installation, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm security:audit`. Install Chromium and Chrome, then run `pnpm test:e2e` and `pnpm test:webmcp` sequentially. Native checks need the actual experimental API; ordinary injected-adapter checks do not certify native execution.

Report measured before/after behavior and proportionate validation. Keep private credentials, generated output and exploratory QA outside source. `.env.example` contains disabled scaffolding, not a required setup step.

Packaging requires a clean committed tree. CI checks the ZIP's known source bytes, license and checksums, then installs, builds and runs both browser suites from the extraction. Only a verified main push can publish its same-run artifact; the publisher checks exact main/tag identity and asset digests. Published release assets are immutable.
