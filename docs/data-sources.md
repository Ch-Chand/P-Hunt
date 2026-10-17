# Data sources and permitted use

## Historical seed CSV

`twenty_unverified_leads.csv` is the exact owner-supplied 20-lead reference for this build. Its product names, supplier labels and historical advertised prices are **UNVERIFIED**, not a supplier feed. Blank supplier URLs/SKUs, delivery prices, stock, transaction counts, competing offers and evidence dates remain unknown. A generated internal demo identifier is not a verified supplier SKU.

The supplier names identify historical investigation leads, not approved supplier relationships or rights to fulfil orders. A low-risk label copied from the historical file is preliminary screening, not a completed safety review. No product imagery is fetched from a supplier or marketplace.

The ratchet screwdriver set, wicker baskets and spray squeegee were preliminary investigation leads, not an approved top three. The seeded universe has zero approved-to-list products. Historical advertised item cost is kept separate from verified landed cost; null shipping is never treated as free shipping.

## Source classifications

| Classification | What it can mean in this delivery | What it cannot establish |
| --- | --- | --- |
| Unverified historical lead | A title/supplier and old advertised reference amount from the supplied CSV. | Current cost, stock, SKU identity, permission, sales or margin eligibility. |
| Demo/manual scenario | A browser-entered hypothetical price/cost, visible as a scenario. | Supplier confirmation, invoice, rights, demand or delivery agreement. |
| Synthetic demo evidence | An explicitly fictional, separate, evidence-complete model example. | Any real product's final rating or legal permission. |
| Verified supplier feed | Reserved for a later authorised supplier connector with source records. | Sold history or market-wide demand. |
| Authorised market provider | Reserved for a reviewed licence with exact permitted uses and retention. | Unrestricted reuse beyond that licence. |

Non-demo evidence must eventually include source type, URL or document reference, recorded UTC timestamp, valid-as-of timestamp, capturing actor, licence basis and source record where applicable. Evidence must describe the exact variant/pack, geography, transaction unit and observation period. Supplier, manual and licensed market provenance remain separate.

## Restricted capabilities stay off

The initial flags are `EBAY_API_ENABLED=false`, `EBAY_MARKET_ANALYTICS_LICENSED=false` and `EBAY_PRICING_ANALYTICS_LICENSED=false`. No credential, successful HTTP request or browser toggle supplies the missing authorisation. Marketplace-history/price modelling must fail closed until source-specific permission, capability, allowed use and retention are documented and verified.

Ordinary eBay Browse API access covers active listings; it does not supply ordinary historical sold-data access. An asking price is not a completed sale. A cumulative sold count is not a dated 30-day count. Similar titles do not prove identical SKU/variant/pack quantity. Technical access to content does not by itself authorise derivative pricing, seller statistics or AI use.

No eBay scraping, authentication bypass, sold-history workaround, restricted price recommendation, paid AI dependency, auto-listing, repricing, ordering or fulfilment is implemented. Future integrations require review of the then-current official policy/licence and provider contract, not an assumption based on this documentation.

## Fees and timestamps

The demo fee policy has an explicit version/effective date and **illustrative** status. It is not an official, verified or current eBay UK category schedule. The user must confirm category/tax/fee details from the official UK business fee table before any real approval. Reference: <https://www.ebay.co.uk/help/selling/fees-credits-invoices/store-selling-fees?id=4809>.

Dates represent fixture provenance or browser scenario/run creation. A simulated run does not refresh external evidence. Storage conventions use ISO UTC timestamps; UI date display uses `Europe/London`. Freshness uses the evidence timestamp, not the time a dashboard was opened.

