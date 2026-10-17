# Calculation and evidence methodology

These deterministic rules model **contribution before overhead and income tax**. They are not a sales forecast, final accounting advice or a guarantee of profit. The scenario price is chosen by the user; no marketplace content is used to derive it. `packages/domain` is the calculation source of truth shared by the UI and available to a future backend.

## Money and rounding

GBP amounts are integer pence and rates are integer basis points: `100 bps = 1%`, `10,000 bps = 100%`. Decimal strings accept at most two fractional digits and are parsed by separating pounds/pence, rather than multiplying a JavaScript decimal by 100. Invalid, negative, over-precision or unsafe-integer inputs are rejected.

Percentage calculations use BigInt rational arithmetic, rounded to the nearest penny with halves away from zero. Currency formatting divides by 100 only for display. Scoring/chart display can use floating-point normalisation; it never changes money or exact financial gate comparisons.

Final-value tiers are progressive/marginal, not a rate applied to the whole order once a tier is crossed. The engine sums exact tier numerators and rounds the final-value fee once. It calculates the regulatory fee separately, chooses the first inclusive per-order threshold, allocates listing/upgrades/renewal cost and applies fee VAT once to the combined net marketplace fees. Tier/order rules must increase and end with an open-ended rule.

## Base contribution

For the default non-VAT-registered UK scenario:

```text
buyer revenue = selling price + buyer postage charged
supplier paid = quantity × supplier unit cost + supplier postage + handling
                + non-recoverable supplier VAT when the quote excludes VAT
landed cost = supplier paid + packaging
marketplace fees = final-value fee + fixed order fee + regulatory fee
                   + allocated listing/upgrades/renewals + fee VAT
advertising allowance = buyer revenue × chosen advertising rate
returns allowance = buyer revenue × chosen expected-loss rate
contribution = buyer revenue − landed cost − marketplace fees
               − advertising allowance − returns allowance − other variable costs
contribution margin = contribution / buyer revenue
```

The order's selling price is its total buyer-facing amount; supplier unit cost is multiplied by the selected quantity. Supplier postage and handling are per order. Listing cost is `(listing fee + upgrades) × (renewal periods + 1) × order quantity / expected units sold`, rounded once. Expected listing sales must cover the order quantity. This makes a multi-unit allocation and unsold Good 'Til Cancelled renewal assumption explicit.

Supplier unit cost, shipping and handling share the chosen quote VAT basis. Packaging and other costs are gross with no separately inferred input VAT recovery. Advertising and returns are allowances based on gross buyer revenue; they do not infer an invoice or deductible VAT. The simplified registered scenario separates output VAT from buyer revenue, recovers the modelled supplier/marketplace VAT and compares contribution with revenue excluding output VAT. It does not handle mixed VAT rates, exemptions, partial recovery or every tax circumstance; verify the selected tax assumptions before real use.

Unknown supplier cost, shipping or quote tax treatment makes financial completion false and contribution/margin/landed cost null. Zero is accepted only as an explicit scenario amount; a missing source fact is not silently converted to free delivery or a verified zero charge. A financial calculation remains hypothetical until its cost evidence and fee policy are verified.

## Illustrative fee policy

Policy `demo-uk-fees-2026-10-16-v1` is explicitly **DEMO / NOT VERIFIED**:

| Input | Illustrative assumption |
| --- | --- |
| Final-value rate | 12% of buyer revenue. |
| Per-order fee | £0.30 for revenue up to and including £10; £0.40 above £10. |
| Regulatory rate | 0.35% of buyer revenue. |
| Listing fee | £0.30 before allocation/renewals. |
| Fee VAT | 20% on combined net modelled marketplace fees. |
| Default advertising/returns | 2% / 3% of buyer revenue. |

For £20 revenue, £9 supplier unit cost, £3 supplier shipping and £0.40 handling, with the quote tax-inclusive and one unit/listing period, contribution is **£2.80** and margin **14.0%** under this illustrative policy. It fails both default financial targets despite the headline gap between selling and supplier price. These are not current official eBay UK fees. The policy's `verifiedOn` is null.

## Scenarios, threshold prices and cash float

Base uses the supplied scenario inputs. Stress reduces the manually chosen selling price by 10%, increases entered supplier postage by 20%, increases the returns-loss rate by 50% (capped at 100%) and adds one listing renewal. Unknown postage stays unknown. Optimistic halves only the hypothetical returns-loss allowance; it does not invent a negotiated supplier quote or change a price based on marketplace data. All three scenarios retain their assumptions and policy identifiers.

The default financial screen requires **both** contribution of at least £4 **and** margin of at least 20%. Margin gates use the exact integer ratio, not the rounded percentage shown on screen. Break-even requires nonnegative contribution; the target-price scenario requires both configured targets. The solver checks whole-penny candidate prices through the complete fee function, returning the smallest qualifying price within a bounded search (default £1,000; maximum allowed bound £10,000). It returns null when inputs are incomplete or the bound has no solution. The exhaustive bounded search handles fixed-order-fee jumps and penny-rounding discontinuities that could invalidate an ordinary monotone binary search.

Float exposure is `sum(supplier paid per order × concurrent unsettled orders) + reserve`. Defaults are a £350 planning budget and £50 reserve, within the specification's £200–£500 planning range. Any unknown supplier payment for a positive order count makes exposure unknown. Float is cash exposure before marketplace settlement, not evidence that orders will occur.

## Evidence, gates and ratings

Missing, stale, mismatched or non-permitted evidence cannot produce a final overall rating. A manual scenario can demonstrate arithmetic without verifying costs, permission or demand. Each hard gate returns a typed reason and readable explanation so a blocked candidate remains understandable. Seed leads retain null ratings; no quota forces three approvals.

Hard gates cover documented supplier fulfilment permission; source use rights; complete verified landed cost; exact variant/pack; safety; contribution and margin targets; recent stock; verified delivery; recent, sufficient, authorised UK transactions; and a returns path. Safety and operational blocks remain prominent even if an evidence-complete example receives a high numeric score. An attractive rating is a research-priority label, never an automated listing approval.

Model `research-screen-v1.0.0` clamps each normalised input to 0–100 and combines these components:

| Component | Weight | Raw-input rubric |
| --- | --- | --- |
| Profitability | 30 | Equal parts exact contribution margin normalised from 10–35%, and absolute contribution from £0–£10. |
| Demand | 25 | 70% transaction volume from 0–50 units/30 days; 30% distinct sellers from 0–5. |
| Competition | 20 | `sales30d / max(activeExactOffers, 1)`, normalised from 0–5, multiplied by `1 − largestSellerShare`. This is a **screening proxy**, not official marketplace sell-through. |
| Supplier | 15 | 25 raw points each for approved fulfilment permission, delivery within five days, fresh stock above zero and verified returns. |
| Risk | 10 | Low risk 100, medium 50, high 0. High risk independently blocks the candidate. |

Components retain raw inputs, source references, normalisation rules and valid-as-of dates. Overall rating bands are 80–100 `HIGH_RESEARCH_PRIORITY`, 65–79 `REVIEW` and below 65 `LOW_PRIORITY`. They describe research priority, not predictive probability or automatic approval. Completeness counts nine evidence records plus a usable fee policy (ten requirements). An incomplete cost scenario makes its cost record unusable. Real research requires a verified non-demo policy; only the separate synthetic sandbox accepts the illustrative policy.

The default freshness windows are seven days for cost/stock, 14 days for demand/competition and 90 days for permission/identity/safety/delivery/returns. Future-dated, expired, unverified, unlicensed or wrong-use evidence fails. Demand requires explicit observation-period start/end timestamps spanning exactly 30 days; the period must end no later than the evaluation time and no more than 14 days before it. The demand threshold is at least 15 comparable UK transactions in that period across three sellers; this is an owner-adjustable screening heuristic, not an eBay rule or universally validated demand threshold. Delivery must be at most five days and stock at least one unit.

Confidence is separate: freshness/completeness contribute up to 30 points each by the fraction of usable evidence, exact identity contributes 20 and corroboration from more than one usable evidence source reference contributes 20. Below 50 is Low, 50–79 Medium and 80–100 High. Confidence cannot make restricted/missing evidence eligible. Exact implementation is in `packages/domain`; synthetic examples are restricted to the separate `sandbox-*` fixture and labelled DEMO throughout. Seed leads never receive synthetic evidence.

## Reproducibility and scope

Scenario results retain fee policy and assumptions versions. Simulated screening evaluates the current demo fixtures and does not refresh external evidence. Exports identify demo mode, source records, reasons and calculation/score versions; formula-like text cells are escaped. Browser edits and mock runs are not a persisted audit log. Immutable backend snapshots, human approval records, private signed reports, and live versioned source histories are later milestones.
