# Scout — Devpost submission copy

## Tagline

Know the market before you make the offer.

## Project description

Scout is a transparent Pokémon card buying assistant for people and agents. It normalizes the exact card, printing, condition, grading company, and numeric grade before comparing any price. Buyers can inspect current availability, total acquisition cost, the latest exact comparable sale, robust 30- and 90-day medians, Seller Trust evidence, listing warnings, and a fully explained Deal Score.

The Phase 1 judge build is deliberately synthetic-only. Every card, seller, marketplace, listing, and sale is fictional and visibly labeled. This lets judges test the complete workflow without fabricated API claims, scraping, credentials, or accidental mixing of demo and live records.

## Inspiration

Collectible-card buyers often have to reconcile ambiguous listing titles, asking prices, shipping, grade-specific sales, and seller evidence across several tabs. A PSA 10 is not a PSA 9; a raw Near Mint card is not a slab; and one extreme sale should not define the market. We wanted an assistant that shows its work and is as comfortable saying “insufficient evidence” as it is ranking a deal.

## What it does

- Searches normalized card identities and exact raw/graded market tiers.
- Compares current total acquisition cost with the latest exact sale and robust 30/90-day market statistics.
- Detects duplicate exposures and flags extreme price anomalies without hiding the audit trail.
- Produces an inspectable Deal Score and platform-specific Seller Trust Score, withholding either when evidence is inadequate.
- Surfaces listing risks such as stock photos, weak seller history, title/description conflicts, no returns, high shipping, and missing certification evidence.
- Compares two to five listings and shows raw versus graded markets without pooling unlike tiers.
- Registers six read-only WebMCP tools: `search_cards`, `get_card_market_state`, `assess_listing`, `compare_listings`, `find_deals`, and `compare_raw_vs_graded`.
- Lets a WebMCP tool result update the visible collector workspace, so the person can inspect the same evidence the agent used.

## How we built it

Scout is a strict TypeScript and React application built with Vite and deployed through OpenAI Sites. A provider-adapter boundary maps catalog, listing, sales-history, and seller sources into canonical domain records. Deterministic engines handle identity, deduplication, exact comparable matching, median/MAD statistics, Seller Trust, listing risk, and Deal Score. The React UI and imperative WebMCP registrations call the same `CardMarketService`, preventing agent and screen results from drifting.

Responses carry data mode, synthetic status, source capabilities, retrieval time, limitations, methodology version, and suggested UI state. A service invariant rejects any attempt to introduce non-synthetic records into Phase 1. The disabled eBay configuration contains only server-side environment placeholders—no fake endpoint or fallback data.

## Challenges we ran into

The hardest part was refusing false equivalence. Marketplace titles are loose, but market estimates must be strict enough to keep variant, language, raw condition, grading company, and numeric grade separate. We also needed robust statistics that keep anomalies auditable while preventing them from distorting the estimate, plus score coverage rules that do not turn missing evidence into false certainty.

The other challenge was designing WebMCP as the product interface rather than a demo wrapper. Each tool has strict schemas, read-only annotations, structured provenance, honest limitations, and UI-state metadata, while using exactly the same service as the human interface.

## Accomplishments we are proud of

- Six WebMCP tools are discovered from the live page and covered by tests.
- Exact-tier rules prevent PSA 10, PSA 9, BGS 9.5, CGC 10, and raw condition data from being pooled.
- The 90-day engine uses shipping-inclusive medians, recency weighting, dispersion, and log-price median absolute deviation anomaly flags.
- Scores explain every weighted component and are withheld when evidence coverage is too low.
- Synthetic/live isolation, capability-scoped sources, security headers, CI, strict schemas, and a zero-known-vulnerability audit are part of the repository foundation.

## What we learned

Agent-ready commerce tools need more than a convenient function signature: they need provenance, confidence, exact identity boundaries, and a path back to inspectable human evidence. We also learned that withholding a score is a feature. A trustworthy assistant should expose uncertainty instead of manufacturing precision.

## What's next

Phase 2 moves adapters, credentials, rate limits, caching, persistence, and scheduled ingestion behind a server boundary. We will re-verify current provider terms and enable one approved live source at a time, starting only where documented access can support the fields we display. PostgreSQL/Prisma storage, an identity-review queue, sandbox provider contract tests, authentication, saved searches, and alerts follow. No marketplace will be enabled through scraping or an undocumented workaround.

## Links

- Demo: https://scout-webmcp-2026.alx21.chatgpt.site/
- Video: https://youtu.be/vIeV29z518A
- Submission: https://devpost.com/software/cardscout
- Source: https://github.com/agammann/scout-webmcp
