import { type Evaluation, type Product, SCORING_VERSION, DEMO_FEE_POLICY } from '@research/domain';
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
}
export function reportCsv(
  entries: { product: Product; evaluation: Evaluation }[],
  runId = 'DEMO-current',
  at = new Date().toISOString(),
): string {
  const columns = [
    'mode',
    'scan_id',
    'scan_at_utc',
    'algorithm_version',
    'fee_policy',
    'assumptions_version',
    'product_id',
    'title',
    'supplier_sku',
    'variant',
    'pack_quantity',
    'supplier',
    'supplier_permission',
    'source_cost_pence_UNVERIFIED',
    'shipping_pence',
    'handling_pence_UNVERIFIED',
    'scenario_selling_price_pence',
    'scenario_price_basis',
    'landed_cost_pence',
    'category_fee_pence',
    'order_fee_pence',
    'regulatory_fee_pence',
    'listing_fee_pence',
    'fee_vat_pence',
    'advertising_pence',
    'returns_allowance_pence',
    'contribution_pence',
    'margin_bps',
    'demand_30d',
    'demand_source',
    'competition_proxy',
    'risk',
    'evidence_confidence',
    'rating',
    'gate_status',
    'gate_reasons',
    'source_document',
    'source_record',
    'source_recorded_at',
    'source_valid_as_of',
    'reviewer_decision',
  ];
  const rows = entries.map(({ product: p, evaluation: e }) => [
    'DEMO_UNVERIFIED',
    runId,
    at,
    SCORING_VERSION,
    DEMO_FEE_POLICY.id,
    e.economics.assumptionsVersion,
    p.id,
    p.title,
    p.supplierSku,
    p.variant,
    p.packQuantity,
    p.supplier,
    'NOT_DOCUMENTED',
    p.historicalUnitCostPence,
    p.historicalShippingPence,
    p.historicalHandlingPence,
    e.economics.revenuePence,
    p.suggestedScenarioPricePence === null
      ? 'GENERIC_HYPOTHETICAL_DEFAULT_NOT_MARKET_DATA'
      : 'HISTORICAL_MANUAL_TARGET_UNVERIFIED',
    e.economics.landedCostPence,
    e.economics.fees.finalValueFeePence,
    e.economics.fees.orderFeePence,
    e.economics.fees.regulatoryFeePence,
    e.economics.fees.listingFeePence,
    e.economics.fees.marketplaceVatPence,
    e.economics.advertisingPence,
    e.economics.returnsAllowancePence,
    e.economics.contributionPence,
    e.economics.marginBps,
    null,
    null,
    null,
    p.risk,
    e.confidence.score,
    e.rating,
    e.status,
    e.gates
      .filter((g) => !g.passed)
      .map((g) => `${g.code}: ${g.reason}`)
      .join(' | '),
    p.source.sourceUrlOrDocument,
    p.source.sourceRecordId,
    p.source.recordedAt,
    p.source.validAsOf,
    'NOT_REVIEWED',
  ]);
  return '\uFEFF' + [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export function exportCsv(
  entries: { product: Product; evaluation: Evaluation }[],
  runId?: string,
  at?: string,
) {
  const url = URL.createObjectURL(
    new Blob([reportCsv(entries, runId, at)], { type: 'text/csv;charset=utf-8;' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `fieldwork-DEMO-${runId ?? 'all-leads'}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
