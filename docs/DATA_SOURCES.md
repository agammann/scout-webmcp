# Data sources

Scout currently loads only bundled, fictional fixtures from `src/providers/demo/data.ts`.

| Source                                  | Implemented behavior                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| HoloForge Demo                          | Fictional catalog, listing, seller, and sale records.                          |
| Collector Circuit Demo                  | Fictional catalog, listing, seller, and sale records.                          |
| eBay                                    | Disabled configuration scaffolding; no request or live adapter is implemented. |
| Other marketplaces and grading services | No integration.                                                                |

The sample has three cards, ten listings after deduplication, and nine exact tiers. Every record carries synthetic provenance, and source URLs use `.invalid`. The fixed as-of timestamp is `2026-08-29T12:00:00.000Z`.

Do not use this sample to estimate real card prices. It is for exploring the calculations and testing browser-agent workflows.

Any future live integration requires current official API documentation, permitted access, data-display rights, server-side credentials, input validation, and real integration tests. These prerequisites have not been implemented or established by this release. A provider's aggregate guide price cannot stand in for an individual sale or populate transaction counts.
