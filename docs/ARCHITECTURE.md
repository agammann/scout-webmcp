# Architecture

```text
bundled fictional records + provenance
  -> exact identity and tier keys
  -> dedupe, matching, statistical windows
  -> seller evidence, listing risks, Deal Score
  -> CardMarketService
       -> React interface
       -> six page-side WebMCP tools
```

React and WebMCP share the same deterministic service and filter function. Search results carry matching listing IDs, so the interface does not display unfiltered listings beneath filtered cards. Tool callbacks update the selected card, listing, comparison, or search result. Empty results clear prior selections.

The application is a Vite/React single-page client. The Sites worker serves embedded build assets and security headers and rejects write methods. It has no provider calls or data persistence. The local production preview runs the same worker handler through Node HTTP.

Successful responses carry data mode, synthetic marker, source capabilities, limitations, methodology version, and UI-state metadata. The route field is descriptive, not a saved URL. Page reload resets selections.

Provider interfaces define a possible future boundary; the current sample service loads an immutable fixture snapshot. It rejects non-synthetic provider statuses and non-synthetic listing, sale, or seller provenance. Statistics and dedupe also keep modes, currencies, and exact markets separate.

The Prisma schema and disabled eBay configuration are unused proposals. A live server, ingestion, credential handling, persistence, and refresh pipeline would require separate implementation and verification. See PHASE_2.md for that future work.
