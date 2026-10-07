# Scout v1 scope, upgrade and recovery

Source 1.1.1 is a browser-only lab over three fictional cards, ten deduplicated listings and nine exact market tiers. The sample date is August 29, 2026. The `scout-lab-v1.1` methodology, source records, tier isolation and six read-only page tools remain unchanged.

## First successful use

Follow [the usage guide](DEMO.md): search Ember Dragon ex, select CGC 10, inspect the two exact-tier listings and compare their evidence. Applying a $500 budget, minimum trust 90 and minimum discount 5% leaves `listing-hf-1042` at $425.00 including known shipping. These are fixed sample calculations.

Manual use needs no account, API key or WebMCP. Native page-tool use needs a compatible browser and client; enabling a browser flag alone does not connect an agent.

## Session behavior and recovery

Scout uses no application-level persistent storage. Filters, selected listings and comparisons exist only in the current page session. Reload clears them. There is no import, export, backup, watchlist, alert or cross-device account to recover. A bookmarked URL opens the lab, not a saved comparison. Reapply the sample search and filters to repeat a result.

An empty result clears old evidence. Comparison accepts two to five unique listing IDs; remove a row to free a slot. Invalid tool inputs leave the displayed workspace unchanged. Failed native registration leaves manual use available; reload to retry page-tool registration.

## Upgrades and building

Verify the source ZIP against SHA256SUMS, extract it to a fresh directory, and install with Node.js 24+ and pnpm 11.19.0 using the frozen lockfile. This release changes no sample data, calculation model or persisted format. Keep the prior source to roll back, rebuild and restart the local server.

Live provider access, credentials, ingestion, persistence and real market validation are outside this release. The disabled provider configuration and draft database schema are scaffolding; configuring their placeholders does not enable live data. Source CI and actual hosted acceptance are separate checks.
