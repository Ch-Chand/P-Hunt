# ADR 0003: Marketplace capability and rights checks fail closed

Date: 2026-10-16  
Status: Accepted for P0/P1

## Context

Public Browse technical access does not provide ordinary sold-history access or blanket permission for marketplace statistics, derivative suggested pricing or AI processing. A source's legal permission, technical capability and freshness are separate checks.

## Decision

Keep all eBay access, marketplace analytics and pricing analytics flags disabled. Connector contracts must declare source capabilities, reviewed authorisation, allowed uses and retention. Never substitute scraping after a blocked/failed request. Separate manual research, supplier feed and licensed provider provenance. The initial app consumes no external marketplace content.

## Consequences

No final seed ratings or fabricated demand figures are needed to demonstrate the website. Future market integrations require a separately reviewed licence/consent with exact API, scope, field, use and retention evidence. No automatic listing, ordering, repricing or fulfilment enters this architecture.

