# ADR 0002: Integer money and evidence-first eligibility

Date: 2026-10-16  
Status: Accepted for P0/P1

## Context

Historical leads omit delivery, stock, permission and dated demand. A precise-looking score or margin based on assumed free shipping would mislead a user. Financial calculations also need reproducible rounding across browser and future backend code.

## Decision

Keep money in integer GBP pence and rates in a documented exact integer representation. Parse decimal strings before calculations, round at explicit boundaries and version fee/scoring assumptions. Place pure functions and their edge-case tests in `packages/domain`. Preserve unknown source facts as null plus reason. A manually entered scenario cannot replace source verification. Withhold the overall rating when required evidence is missing, stale or non-permitted. Evaluate safety/permission/financial/operational hard gates independently from numeric score.

## Consequences

The seeded universe can have zero approvals. The UI explains each missing fact and gate rather than filling a top-three quota. A separate labelled synthetic example can demonstrate scoring mechanics. A score never predicts sales or overrides a hard failure. All outputs describe contribution before overhead and income tax, with fee assumptions visibly illustrative until verified.

