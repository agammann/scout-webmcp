# Scout demo video

Target runtime: 2:10–2:35. Output: 1920×1080, H.264 video, AAC audio, under the WebMCP Challenge three-minute limit.

## Scene 1 — The promise

Meet Scout: transparent Pokémon card market intelligence for collectors and agents. It answers one practical question—do the available facts support this purchase—without pretending uncertainty is certainty.

## Scene 2 — Normalize first

Scout starts with identity. Set, card number, variant, language, raw condition, grading company, and numeric grade are normalized before any comparison. A P S A ten is never pooled with a P S A nine or a raw Near Mint copy.

## Scene 3 — Market evidence

In the market view, Scout adds item price and known shipping, then shows the latest exact sale, thirty- and ninety-day medians, clean range, sample size, and confidence. Robust median and deviation checks keep one extreme sale from defining the market.

## Scene 4 — Compare the whole purchase

Every listing has an explainable Deal Score, separate Seller Trust evidence, and explicit alerts. The strongest price is not automatically the best purchase. Compare view aligns total cost, market delta, trust, comp quality, returns, and listing risks side by side.

## Scene 5 — Show the method

Methodology stays inspectable. Price evidence carries the most weight, but confidence, seller history, listing quality, and liquidity also matter. If coverage is too weak, Scout withholds the score instead of inventing precision. Nothing here is investment advice.

## Scene 6 — WebMCP is the interface

Web M C P is the product interface, not a demo wrapper. An agent can ask: find C G C ten Ember Dragon ex listings under five hundred dollars, from sellers above eighty-five trust, and at least five percent below the exact ninety-day median. Scout calls find deals, then compare listings, returns structured provenance and score components, and updates the same visible workspace the collector can inspect.

## Scene 7 — Honest data boundaries

This build is deliberately synthetic-only. Every card, listing, seller, sale, and marketplace is visibly fictional. Provider adapters describe supported capabilities, while unavailable live sources stay disabled behind server-side configuration. Scout never substitutes scraping or fake production data for approved access.

## Scene 8 — Close

Scout gives people and agents one honest evidence trail: exact identity, robust comps, seller context, and clear uncertainty. Explore the live demo, inspect the public source, and know the market before you make the offer.

## Public links

- Live demo: https://scout-webmcp-2026.alx21.chatgpt.site/
- Video: https://youtu.be/akGIr6avM3g
- Source: https://github.com/agammann/scout-webmcp
- Submission: https://devpost.com/software/cardscout

## Rendering and quality gates

1. Generate the eight 1920×1080 scene images with `scripts/render-scout-demo.py`.
2. Record or synthesize one narration file per scene as `scene-01.mp3` through `scene-08.mp3`.
3. Assemble the scenes with `scripts/render-scout-demo-video.py`, using H.264 video and AAC stereo audio.
4. Verify the final runtime is under 180 seconds, inspect representative frames, and confirm audible narration before upload.
5. Publish only after action-time approval, then verify the public watch page, Devpost embed, and repository link.
