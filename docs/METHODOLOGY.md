# Methodology

## Normalization

Card identity is a deterministic key over normalized name, set code/name, number, year, rarity, variant, finish, edition, language, printing, and promo state. Price comparisons add an exact tier key: raw condition, or grading company plus numeric grade. Raw, PSA 9, PSA 10, BGS 9.5, and CGC 10 are distinct markets.

## Comparable sales

Listings and sales are deduplicated first. Exact same-card and same-tier sales are ordered by completion time. CardScout reports the latest exact sale immediately, but requires at least three relevant transactions to publish rolling medians.

The 90-day series uses total sold cost (price plus known shipping). With five or more observations, extreme log-price deviations are identified with a median absolute deviation threshold of 3.5. Anomalies remain visible by ID but are excluded from robust medians and cleaned ranges. A recency-weighted 90-day median uses exponential decay with a 45-day scale.

Confidence combines exact-match quality (35%), sample size (25%), recency (20%), and cleaned interquartile dispersion (20%). Match quality is fixed at 100 only because the current engine admits exact canonical/tier matches; future fallback matches must lower this component and explain why.

## Seller Trust

Seller Trust combines sample-size-adjusted feedback (35%), transaction volume (15%), recent rating mix (15%), tenure (10%), returns/verification evidence (10%), relevant-category history (10%), and listing consistency (5%). Feedback uses the Wilson lower confidence bound so four perfect ratings do not equal thousands of ratings.

The score is withheld below 55% evidence coverage. Seller identities are platform-specific and are never linked by username similarity.

## Deal Score

Deal Score is 40% total acquisition price versus the exact cleaned 90-day median, 20% comparable-sale confidence, 20% Seller Trust, 10% listing quality, and 10% liquidity. Price uses a bounded logistic transformation so extreme discounts cannot dominate the result. The overall score is withheld without both a reliable median and a Seller Trust score.

Classifications are: 90–100 Exceptional Deal; 80–89 Strong Buy; 70–79 Good Price; 55–69 Fair Price; 40–54 Slightly Expensive; below 40 Overpriced. These labels describe evidence relative to the available market sample, not future return, authenticity, or investment merit.

