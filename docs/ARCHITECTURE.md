# Architecture

## Phase 1 runtime

```text
explicit synthetic providers
        ↓ canonical records + provenance
normalization and identity keys
        ↓
dedupe → exact comparable matching → robust statistics
        ↓
Seller Trust → listing risks → Deal Score
        ↓
CardMarketService
   ↙                 ↘
React UI          WebMCP tools
```

React and WebMCP call the same deterministic service. This prevents an agent result from drifting from what a person sees. Every response includes mode, synthetic marker, source capability status, limitations, methodology version, and navigable UI state.

The Phase 1 implementation uses a Vite single-page build because the reviewed slice is read-only and synthetic; a server runtime would add no valid live capability. The relational schema and provider boundary are prepared for the server-backed Phase 2.

## Provider boundary

- `CardCatalogProvider` resolves external identities into canonical cards.
- `MarketplaceProvider` returns current listings.
- `SalesHistoryProvider` returns sold transactions or aggregate price evidence only when legitimately licensed.
- `SellerProvider` returns platform-specific seller evidence.

An adapter validates upstream payloads, maps them into canonical records, assigns provenance, and never leaks vendor response shapes into the engine. Capability flags prevent the product from implying unavailable seller reviews, individual sales, or population data.

## Phase 2 deployment

```text
documented provider APIs
  ↓ ingestion workers / rate budgets / retries
validated immutable source records
  ↓ normalization + identity candidates + review queue
PostgreSQL + Prisma
  ↓ cached statistics and assessments
server API
  ↙       ↓       ↘
web UI  WebMCP  background refresh
```

Redis-compatible caching may be introduced only for rate-limit budgets, hot searches, and refresh locks. Object storage is optional for licensed snapshots; raw marketplace HTML is not stored.

## Data-mode isolation

`LIVE`, `SANDBOX`, and `SYNTHETIC` are part of storage keys, queries, caches, responses, and metrics. The current service rejects any non-synthetic snapshot. Phase 2 implements an explicit mode-specific service instance; a single assessment can never span modes.

