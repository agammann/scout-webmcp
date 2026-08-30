# Data-source decisions

Status reflects the Phase 1 implementation and must be re-verified against current provider documentation and contracts before production use.

| Source | Realistic role | Phase 1 status | Key limitation |
| --- | --- | --- | --- |
| eBay developer APIs | Current listings; seller metadata where exposed | Adapter contract and disabled credential config only | Production access, approval, scopes, rate limits, and sold-comparable availability must be verified; no scraping fallback |
| TCGplayer | Catalog and price aggregates for approved partners | Not implemented | New API access and permitted fields may be restricted; aggregates are not individual completed sales |
| PriceCharting | Licensed price guide/catalog where a commercial plan permits | Not implemented | Terms, attribution, granularity, and grade/variant matching require commercial review |
| Cardmarket | EU listings/price information for authorized applications | Not implemented | Access, regional scope, personal-data handling, and sold-history fields require approval |
| Mercari | Provider slot only | Not implemented | No public production integration is assumed |
| Whatnot | Provider slot only | Not implemented | No public production integration is assumed |
| Fanatics Collect | Provider slot only | Not implemented | No public production integration is assumed |
| PSA/BGS/CGC | Certification or population evidence where officially permitted | Not implemented | Availability and terms vary; never automate restricted verification pages |

No endpoint, credential, seller rating, listing, or completed sale is fabricated. A source that cannot supply individual sold transactions must be labeled as aggregate guidance and cannot populate `latestSale` or transaction counts.

## Phase 1 demo provider

`demo-holoforge` and `demo-collector-circuit` are fictional adapters. Every record is `SYNTHETIC`, every seller name includes `(Demo)`, and URLs use the reserved `.invalid` domain. They demonstrate the full workflow without implying real data access.

