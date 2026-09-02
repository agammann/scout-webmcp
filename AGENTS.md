# Scout engineering contract

This file governs all work in this repository. Phase 1 is a synthetic-only vertical slice for the OpenAI WebMCP Challenge.

## Commands

- `pnpm dev` — Vite development server.
- `pnpm test` — deterministic unit, integration, UI, and WebMCP tests.
- `pnpm lint` — Oxlint correctness and security-adjacent static checks.
- `pnpm typecheck` — strict TypeScript validation.
- `pnpm build` — production Vite/Sites build.
- `pnpm security:audit` — dependency audit at high severity.

All five verification commands must pass before a release. Add a regression test with every business-logic fix.

## Architecture rules

1. Keep provider records behind `CardCatalogProvider`, `MarketplaceProvider`, `SalesHistoryProvider`, and `SellerProvider` contracts. Engines may depend on canonical domain types, never vendor response shapes.
2. Map and validate provider payloads at the adapter boundary. Preserve provider ID, retrieval time, data mode, and source identity on every record.
3. `SYNTHETIC`, `SANDBOX`, and `LIVE` are isolated data modes. Never silently mix them in a response, score, aggregate, cache, or database query.
4. Demo data must be fictional, visibly labeled, and use non-resolving `.invalid` URLs. Never make synthetic data resemble a real seller or completed transaction.
5. A provider without documented, permitted access stays disabled. Environment placeholders are not an integration. Do not scrape, evade CAPTCHA, bypass authentication, or defeat rate limits.
6. Keep scoring functions deterministic and side-effect free. Methodology versions travel with API and WebMCP results.
7. WebMCP tools are a first-class interface over the same service used by React. Do not create a second business-logic path for agents.
8. Phase 1 is a read-only browser application. A future server/API owns credentials, persistence, rate limiting, scheduled ingestion, and live-provider calls.

## Card normalization invariants

- Canonical identity includes name, set, set code, card number, year, rarity, variant, finish, edition, language, printing, and promo state.
- A market tier is either raw plus exact condition, or graded plus exact company and numeric grade.
- Never pool raw and graded cards, different raw conditions, grading companies, numeric grades, languages, card numbers, printings, editions, or variants.
- Certification number is listing evidence and a dedupe signal; it does not replace the company-and-grade market tier.
- Preserve unknown values explicitly. Do not infer `first edition`, `shadowless`, language, condition, grade, or certification from weak keyword overlap.
- Cross-platform seller accounts remain separate unless explicit public evidence establishes common ownership.

## Comparable-sales and scoring rules

- Dedupe before counting. Marketplace ID and canonical URL are strongest; certification, seller, image, title, price, and timestamp are secondary signals.
- Comparable sales must match exact canonical card variant and exact market tier.
- Display the latest exact sale even when the rolling median is withheld.
- Require at least three non-anomalous 90-day transactions for a 90-day median and three 30-day transactions for a 30-day median.
- Flag, but retain for audit, extreme log-price deviations; exclude flagged anomalies from robust median/range calculations.
- Deal Score weights are price 40%, comp quality 20%, seller trust 20%, listing quality 10%, liquidity 10%. Withhold the overall score if the 90-day market median or Seller Trust is unavailable.
- Seller Trust uses only platform-specific evidence. Withhold the score below 55% evidence coverage.
- Scores are decision support, never an authenticity guarantee, investment recommendation, or profit forecast. The UI and tool results must keep limitations visible.

## Security requirements

- Validate untrusted input with strict allowlists, length/range limits, and schemas with `additionalProperties: false`.
- Keep all credentials server-side and out of `VITE_` variables, browser bundles, logs, snapshots, fixtures, and error messages.
- Permit outbound requests only to configured HTTPS provider hosts. Reject private, loopback, link-local, redirect-to-private, and credential-bearing URLs to prevent SSRF.
- Use parameterized database access, output escaping, least-privilege credentials, timeouts, retries with jitter, circuit breakers, and per-provider rate budgets.
- Do not render provider HTML. Treat titles, descriptions, seller names, reviews, and URLs as untrusted text.
- Never log secrets, raw auth headers, full certification numbers, or unnecessary personal data.
- Production releases require dependency review and documented data licensing/retention terms.

## Testing requirements

- Identity tests must prove PSA 10 != PSA 9, PSA != CGC/BGS, raw != graded, and condition/language/variant isolation.
- Provider contract tests cover validation, provenance, mode isolation, throttling, and error mapping.
- Statistics tests cover windows, exact matches, dedupe, small samples, anomaly handling, and deterministic medians.
- Score tests cover thresholds, missing evidence, shipping-inclusive price, and explanation components.
- WebMCP tests cover registration, read-only annotations, strict schemas, invalid input, structured provenance, and UI-state metadata.
- UI tests cover the synthetic-data banner, search, comparison guardrails, score explanations, and inaccessible/live-provider states.

## Pull-request checklist

Document data provenance, privacy/licensing implications, migrations, methodology changes, and user-visible limitations. Run tests, lint, typecheck, build, and the high-severity audit; report the exact results without overstating untested behavior.
