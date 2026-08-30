# CardScout

CardScout is a Pokémon card buying-assistant prototype that normalizes card identity before comparing acquisition cost, exact-tier comparable sales, seller evidence, and listing risk. It exposes the same evidence through a collector-focused interface and six structured WebMCP tools.

Phase 1 is intentionally **synthetic-only**. Every displayed card, seller, listing, marketplace, and sale is fictional and labeled. No real marketplace integration is claimed, no credentials are bundled, and live and synthetic records cannot be mixed by the service invariant.

## What works

- Natural card search plus budget, raw/graded, grade, Seller Trust, and below-market filters.
- Canonical identity and exact tier separation for raw condition and PSA/BGS/CGC grades.
- Current-listing comparison using price plus known shipping.
- Deduplicated exact comparable sales, latest sale, 30/90-day windows, robust medians, ranges, anomaly flags, and confidence.
- Transparent Deal Score and platform-specific Seller Trust Score with evidence coverage and withholding.
- Listing warnings for weak photos, ambiguity, limited seller history, no returns, high shipping, and sparse comps.
- Two-to-five listing comparison and raw-versus-graded views.
- WebMCP tools that return structured data, provenance, limitations, methodology versions, and suggested UI state.

## Run locally

Requirements: Node.js 22.13+ and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173`.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm security:audit
```

## WebMCP tools

CardScout registers read-only tools through `document.modelContext.registerTool` when the browser supports WebMCP:

- `search_cards`
- `get_card_market_state`
- `assess_listing`
- `compare_listings`
- `find_deals`
- `compare_raw_vs_graded`

Example request:

> Find graded Ember Dragon ex cards under $500, from sellers with trust over 85, at least 5% below the exact 90-day median.

Tools are strict, read-only, and return `dataMode`, `synthetic`, source status, limitations, methodology version, and `uiState` alongside the domain result.

## Repository map

- `src/domain` — canonical types and identity rules.
- `src/providers` — provider contracts, explicit demo provider, disabled live-adapter configuration.
- `src/engine` — dedupe, robust market statistics, seller trust, risk, and deal scoring.
- `src/services` — shared use cases and data-mode isolation.
- `src/webmcp` — structured tool registration and validation.
- `components` — responsive collector interface.
- `prisma` — reviewed relational schema for the Phase 2 server.
- `docs` — architecture, methodology, data-source decisions, demo flow, and roadmap.
- `tests` — deterministic regression suite.

## Data and legal posture

The demo uses no Pokémon artwork, marketplace trademarks, marketplace data, real seller identities, or real completed sales. Future live adapters require documented provider access, reviewed terms, retention rules, attribution, and server-side credentials before enablement. See `docs/DATA_SOURCES.md` and `SECURITY.md`.

CardScout is not affiliated with Nintendo, The Pokémon Company, Game Freak, any grading company, or any marketplace. Scores are decision support, not authentication, investment advice, or a profit guarantee.

