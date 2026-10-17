import {
  calculateEconomics,
  defaultScenario,
  DEMO_FEE_POLICY,
  meetsMargin,
  type EconomicsResult,
} from './economics';
import { divideHalfUp } from './money';
import {
  createProvenance,
  DEFAULT_THRESHOLDS,
  productSchema,
  thresholdsSchema,
  type EvidenceKey,
  type EvidenceRecord,
  type FeePolicy,
  type Product,
  type ProductEvidence,
  type Provenance,
  type ScenarioInput,
  type Thresholds,
} from './schemas';

export const FEATURE_FLAGS = Object.freeze({
  EBAY_API_ENABLED: false,
  EBAY_MARKET_ANALYTICS_LICENSED: false,
  EBAY_PRICING_ANALYTICS_LICENSED: false,
});
export const SCORING_VERSION = 'research-screen-v1.0.0';
export const EVIDENCE_FRESHNESS_DAYS: Record<EvidenceKey, number> = {
  supplierPermission: 90,
  exactVariant: 90,
  cost: 7,
  safety: 90,
  stock: 7,
  delivery: 90,
  returns: 90,
  demand: 14,
  competition: 14,
};

export const EVIDENCE_LABELS: Record<EvidenceKey, string> = {
  supplierPermission: 'Documented wholesale fulfilment permission',
  exactVariant: 'Exact SKU, variant and pack identity',
  cost: 'Actual landed cost and VAT basis',
  safety: 'Product safety review',
  stock: 'Fresh available stock',
  delivery: 'Verified delivery arrangement',
  returns: 'Verified returns path',
  demand: 'Authorised exact-product UK 30-day transactions',
  competition: 'Authorised exact-offer competition evidence',
};

export interface EvidenceCheck {
  key: EvidenceKey;
  label: string;
  usable: boolean;
  reason: string;
}
export type GateCode =
  | 'SUPPLIER_PERMISSION'
  | 'SOURCE_PERMISSION'
  | 'LANDED_COST'
  | 'EXACT_VARIANT'
  | 'SAFETY'
  | 'MIN_CONTRIBUTION'
  | 'MIN_MARGIN'
  | 'STOCK'
  | 'DELIVERY'
  | 'DEMAND'
  | 'RETURNS'
  | 'FEE_POLICY';
export interface GateResult {
  code: GateCode;
  label: string;
  passed: boolean;
  reason: string;
}
export interface ScoreComponent {
  component: string;
  weight: number;
  rawMetric: string;
  unit: string;
  normalisation: string;
  score: number;
  weightedPoints: number;
  dataSource: string;
  validAsOf: string | null;
  limitations: string;
}
export interface Evaluation {
  status: 'BLOCKED' | 'FAILED_GATE' | 'RESEARCH_NEEDED' | 'APPROVED_FOR_REVIEW';
  rating: number | null;
  ratingBand: 'HIGH_RESEARCH_PRIORITY' | 'REVIEW' | 'LOW_PRIORITY' | null;
  confidence: { score: number; level: 'Low' | 'Medium' | 'High' };
  completeness: { present: number; total: number; missing: string[] };
  gates: GateResult[];
  components: ScoreComponent[];
  economics: EconomicsResult;
  evidenceChecks: EvidenceCheck[];
  algorithmVersion: string;
  isDemo: boolean;
}

function isSandbox(product: Product): boolean {
  return (
    product.id.startsWith('sandbox-') &&
    product.source.sourceType === 'demo' &&
    product.source.isDemo
  );
}

function sourceIssue(
  source: Provenance,
  key: EvidenceKey,
  now: number,
  sandbox: boolean,
): string | null {
  if (source.isDemo && !sandbox)
    return 'Synthetic evidence is restricted to the separate DEMO sandbox.';
  if (source.sourceType === 'historical_lead')
    return 'Historical unverified leads are not decision evidence.';
  if (source.provider === 'ebay_api' || /api\.ebay\./i.test(source.sourceUrlOrDocument ?? ''))
    return 'eBay API analytics and pricing are feature-flagged off pending licence review.';
  if (
    source.permission !== 'approved' &&
    !(source.permission === 'manual_only' && source.sourceType === 'user_entered')
  )
    return 'Source permission is pending or blocked; processing fails closed.';
  const use =
    key === 'demand'
      ? 'demand'
      : key === 'competition'
        ? 'competition'
        : key === 'cost'
          ? 'economics'
          : 'scoring';
  if (!source.permittedUses.includes(use)) return `Source does not permit ${use} use.`;
  if (
    !source.sourceUrlOrDocument ||
    !source.licenceBasis ||
    !source.recordedAt ||
    !source.validAsOf
  )
    return 'Source reference, rights basis and evidence timestamps are required.';
  const recorded = Date.parse(source.recordedAt);
  const valid = Date.parse(source.validAsOf);
  if (recorded > now || valid > now) return 'Future-dated evidence is not accepted.';
  if (source.expiresAt !== null && Date.parse(source.expiresAt) <= now)
    return 'Source retention/permission has expired.';
  if (now - valid > EVIDENCE_FRESHNESS_DAYS[key] * 86_400_000)
    return `Evidence is stale; ${key} requires evidence within ${EVIDENCE_FRESHNESS_DAYS[key]} days.`;
  if ((key === 'demand' || key === 'competition') && source.sourceType === 'verified_supplier_feed')
    return 'Supplier catalogue data cannot establish marketplace transaction evidence.';
  return null;
}

export function checkEvidence(product: Product, now = new Date().toISOString()): EvidenceCheck[] {
  const parsed = productSchema.parse(product);
  const nowTime = Date.parse(now);
  if (!Number.isFinite(nowTime)) throw new Error('Evaluation time must be a valid ISO timestamp.');
  return (Object.keys(EVIDENCE_LABELS) as EvidenceKey[]).map((key) => {
    const entry = parsed.evidence[key];
    let issue: string | null = null;
    if (!entry) issue = 'Not verified; no evidence record is available.';
    else if (!entry.verified) issue = 'Evidence has not been verified.';
    else issue = sourceIssue(entry.source, key, nowTime, isSandbox(parsed));
    if (!issue && entry) {
      if (key === 'demand') {
        if (entry.measurement !== 'transactions_30d')
          issue = 'Asking prices and cumulative sold counters are not dated 30-day transactions.';
        else if (entry.marketplace !== 'UK') issue = 'Demand must describe UK transactions.';
        else if (entry.sales30d === undefined || entry.sellerCount === undefined)
          issue = 'Dated transaction count and independent seller count are required.';
        else if (!entry.periodStart || !entry.periodEnd)
          issue = 'Explicit observation period start and end are required.';
        else if (Date.parse(entry.periodEnd) - Date.parse(entry.periodStart) !== 30 * 86_400_000)
          issue = 'Demand observation period must cover exactly 30 days.';
        else if (
          Date.parse(entry.periodEnd) > nowTime ||
          nowTime - Date.parse(entry.periodEnd) > EVIDENCE_FRESHNESS_DAYS.demand * 86_400_000
        )
          issue = 'Demand observation period is future-dated or stale.';
        else if (parsed.packQuantity === null || entry.packQuantity !== parsed.packQuantity)
          issue = 'Demand pack quantity does not match the verified product pack.';
      }
      if (
        key === 'competition' &&
        (entry.activeExactOffers === undefined || entry.topSellerShareBps === undefined)
      )
        issue = 'Exact active offers and dated seller concentration are required.';
      if (key === 'stock' && entry.stockQuantity === undefined)
        issue = 'Actual available stock quantity is missing.';
      if (key === 'delivery' && entry.deliveryDays === undefined)
        issue = 'Documented delivery days are missing.';
      if (key === 'supplierPermission' && entry.permissionDecision === undefined)
        issue = 'Supplier permission decision has not been documented.';
      if (
        key === 'exactVariant' &&
        (!parsed.supplierSku || !parsed.variant || parsed.packQuantity === null)
      )
        issue = 'Exact supplier SKU, variant and pack quantity are required.';
      if (key === 'safety' && parsed.risk === 'unknown')
        issue = 'Safety risk has not been categorised.';
    }
    return {
      key,
      label: EVIDENCE_LABELS[key],
      usable: issue === null,
      reason: issue ?? 'Verified, permitted and within the freshness window.',
    };
  });
}

function gate(
  code: GateCode,
  label: string,
  passed: boolean,
  failedReason: string,
  passedReason = 'Requirement satisfied.',
): GateResult {
  return { code, label, passed, reason: passed ? passedReason : failedReason };
}

export function evaluateGates(
  product: Product,
  economics: EconomicsResult,
  now = new Date().toISOString(),
  policy: FeePolicy = DEMO_FEE_POLICY,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): GateResult[] {
  thresholdsSchema.parse(thresholds);
  const checks = checkEvidence(product, now);
  const check = (key: EvidenceKey): EvidenceCheck => checks.find((entry) => entry.key === key)!;
  const verified = (key: EvidenceKey): boolean => check(key).usable;
  const demand = product.evidence.demand;
  const sourcePermitted = (Object.keys(EVIDENCE_LABELS) as EvidenceKey[]).every((key) => {
    const entry = product.evidence[key];
    if (!entry) return true;
    const issue = sourceIssue(entry.source, key, Date.parse(now), isSandbox(product));
    return (
      issue === null ||
      !/source permission|source does not permit|licence|retention|rights|restricted|feature-flagged|not decision evidence/i.test(
        issue,
      )
    );
  });
  const feeVerified =
    (isSandbox(product) && policy.isDemo) ||
    (!policy.isDemo &&
      policy.verifiedOn !== null &&
      Date.parse(policy.verifiedOn) <= Date.parse(now) &&
      Date.parse(policy.effectiveFrom) <= Date.parse(now));
  return [
    gate(
      'SUPPLIER_PERMISSION',
      'Supplier permission',
      verified('supplierPermission') &&
        product.evidence.supplierPermission?.permissionDecision === 'approved',
      check('supplierPermission').usable
        ? 'Supplier fulfilment permission is not approved.'
        : check('supplierPermission').reason,
    ),
    gate(
      'SOURCE_PERMISSION',
      'Permitted source use',
      sourcePermitted,
      'One or more sources lack permission, documented rights or valid retention for this use.',
    ),
    gate(
      'LANDED_COST',
      'Complete landed cost',
      economics.complete && verified('cost'),
      !economics.complete ? economics.missing.join('; ') : check('cost').reason,
    ),
    gate(
      'EXACT_VARIANT',
      'Exact product identity',
      verified('exactVariant'),
      check('exactVariant').reason,
    ),
    gate(
      'SAFETY',
      'Product safety',
      verified('safety') && product.risk !== 'high',
      product.risk === 'high'
        ? 'High-risk category is blocked independently of any score.'
        : check('safety').reason,
    ),
    gate(
      'MIN_CONTRIBUTION',
      'Minimum contribution',
      economics.contributionPence !== null &&
        economics.contributionPence >= thresholds.minContributionPence,
      `Contribution must be at least ${thresholds.minContributionPence} pence; current value ${economics.contributionPence ?? 'unknown'}.`,
    ),
    gate(
      'MIN_MARGIN',
      'Minimum contribution margin',
      meetsMargin(economics, thresholds.minMarginBps),
      `Exact contribution margin must be at least ${thresholds.minMarginBps / 100}%; rounded display is not used to pass.`,
    ),
    gate(
      'STOCK',
      'Fresh stock',
      verified('stock') &&
        (product.evidence.stock?.stockQuantity ?? 0) >= thresholds.minStockQuantity,
      verified('stock') ? 'Insufficient verified available stock.' : check('stock').reason,
    ),
    gate(
      'DELIVERY',
      'Delivery arrangement',
      verified('delivery') &&
        (product.evidence.delivery?.deliveryDays ?? Infinity) <= thresholds.maxDeliveryDays,
      verified('delivery')
        ? `Delivery exceeds ${thresholds.maxDeliveryDays} days.`
        : check('delivery').reason,
    ),
    gate(
      'DEMAND',
      'Authorised sufficient demand',
      verified('demand') &&
        (demand?.sales30d ?? 0) >= thresholds.minSales30d &&
        (demand?.sellerCount ?? 0) >= thresholds.minSellers,
      verified('demand')
        ? `Screening heuristic requires ${thresholds.minSales30d} transactions across ${thresholds.minSellers} sellers in 30 days; it is not an eBay rule.`
        : check('demand').reason,
    ),
    gate('RETURNS', 'Returns path', verified('returns'), check('returns').reason),
    gate(
      'FEE_POLICY',
      'Verified fee policy',
      feeVerified,
      'Illustrative or unverified fees cannot approve real research; confirm a date-versioned official policy.',
    ),
  ];
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
function normalise(value: number, low: number, high: number): number {
  return clamp(((value - low) / (high - low)) * 100);
}

function scoreComponents(product: Product, economics: EconomicsResult): ScoreComponent[] {
  const demand = product.evidence.demand!;
  const competition = product.evidence.competition!;
  const contributionPence = economics.contributionPence!;
  const exactMargin = (contributionPence / economics.revenueExVatPence) * 100;
  const profitScore = (normalise(exactMargin, 10, 35) + normalise(contributionPence, 0, 1_000)) / 2;
  const demandScore =
    normalise(demand.sales30d!, 0, 50) * 0.7 + normalise(demand.sellerCount!, 0, 5) * 0.3;
  const proxy = demand.sales30d! / Math.max(competition.activeExactOffers!, 1);
  const competitionScore = normalise(proxy, 0, 5) * (1 - competition.topSellerShareBps! / 10_000);
  const permissionApproved = product.evidence.supplierPermission?.permissionDecision === 'approved';
  const supplierScore =
    (permissionApproved ? 25 : 0) +
    ((product.evidence.delivery?.deliveryDays ?? Infinity) <= 5 ? 25 : 0) +
    ((product.evidence.stock?.stockQuantity ?? 0) > 0 ? 25 : 0) +
    (product.evidence.returns?.verified ? 25 : 0);
  const build = (
    component: string,
    weight: number,
    score: number,
    rawMetric: string,
    unit: string,
    normalisation: string,
    evidence: EvidenceRecord | null,
    limitations: string,
  ): ScoreComponent => ({
    component,
    weight,
    rawMetric,
    unit,
    normalisation,
    score: Math.round(score),
    weightedPoints: Math.round(score * weight) / 100,
    dataSource: evidence?.source.sourceUrlOrDocument ?? 'Not verified',
    validAsOf: evidence?.source.validAsOf ?? null,
    limitations,
  });
  return [
    build(
      'Profitability',
      30,
      profitScore,
      `${contributionPence} pence; ${exactMargin.toFixed(2)}% contribution margin`,
      'pence / percent',
      '50% margin normalised 10–35%; 50% contribution normalised £0–£10.',
      product.evidence.cost,
      'Contribution before overhead and tax; manual scenario, not predicted profit.',
    ),
    build(
      'Demand',
      25,
      demandScore,
      `${demand.sales30d} UK transactions across ${demand.sellerCount} sellers / 30 days`,
      'transactions / 30 days',
      '70% volume normalised 0–50; 30% sellers normalised 0–5.',
      demand,
      'Historical transactions are not a sales forecast.',
    ),
    build(
      'Competition',
      20,
      competitionScore,
      `${proxy.toFixed(2)} screening proxy; ${competition.activeExactOffers} exact offers; ${(competition.topSellerShareBps! / 100).toFixed(1)}% largest seller share`,
      'screening proxy',
      'Transactions / max(exact offers,1), normalised 0–5; multiply by (1 − largest seller share).',
      competition,
      'Screening proxy is not official marketplace sell-through.',
    ),
    build(
      'Supplier',
      15,
      supplierScore,
      `Permission ${permissionApproved ? 'approved' : 'not approved'}; delivery ${product.evidence.delivery?.deliveryDays} days; stock ${product.evidence.stock?.stockQuantity}`,
      'checklist',
      '25 each: permission approved, delivery ≤5 days, fresh stock >0, verified returns.',
      product.evidence.supplierPermission,
      'Checklist assessment, not an observed supplier performance prediction.',
    ),
    build(
      'Risk',
      10,
      product.risk === 'low' ? 100 : product.risk === 'medium' ? 50 : 0,
      `${product.risk} safety risk`,
      'risk category',
      'Low 100; medium 50; high 0. High risk still blocks regardless of score.',
      product.evidence.safety,
      'Decision support, not legal certification.',
    ),
  ];
}

export function evaluateProduct(
  product: Product,
  input: ScenarioInput = defaultScenario(product),
  now = new Date().toISOString(),
  policy: FeePolicy = DEMO_FEE_POLICY,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Evaluation {
  const parsed = productSchema.parse(product);
  const economics = calculateEconomics(input, policy);
  const evidenceChecks = checkEvidence(parsed, now).map((check) =>
    check.key === 'cost' && !economics.complete
      ? { ...check, usable: false, reason: economics.missing.join('; ') }
      : check,
  );
  const present = evidenceChecks.filter((check) => check.usable).length;
  const missing = evidenceChecks
    .filter((check) => !check.usable)
    .map((check) => `${check.label}: ${check.reason}`);
  const gates = evaluateGates(parsed, economics, now, policy, thresholds);
  const feePolicyUsable = gates.find((entry) => entry.code === 'FEE_POLICY')!.passed;
  if (!feePolicyUsable) missing.push(gates.find((entry) => entry.code === 'FEE_POLICY')!.reason);
  const complete =
    present === evidenceChecks.length &&
    economics.complete &&
    economics.revenueExVatPence > 0 &&
    feePolicyUsable;
  const components = complete ? scoreComponents(parsed, economics) : [];
  const rating = complete
    ? Math.round(components.reduce((sum, component) => sum + component.weightedPoints, 0))
    : null;
  const corroboration =
    new Set(
      evidenceChecks
        .filter((entry) => entry.usable)
        .map((entry) => parsed.evidence[entry.key]!.source.sourceUrlOrDocument),
    ).size > 1
      ? 20
      : 0;
  const confidenceScore = Math.min(
    100,
    Math.round((30 * present) / evidenceChecks.length) * 2 +
      (evidenceChecks.find((check) => check.key === 'exactVariant')?.usable ? 20 : 0) +
      corroboration,
  );
  const blocked =
    parsed.risk === 'high' ||
    (parsed.evidence.supplierPermission !== null &&
      (!parsed.evidence.supplierPermission.verified ||
        parsed.evidence.supplierPermission.permissionDecision !== 'approved')) ||
    gates.some((entry) => entry.code === 'SOURCE_PERMISSION' && !entry.passed);
  const status = blocked
    ? 'BLOCKED'
    : !complete
      ? 'RESEARCH_NEEDED'
      : gates.some((entry) => !entry.passed)
        ? 'FAILED_GATE'
        : 'APPROVED_FOR_REVIEW';
  return {
    status,
    rating,
    ratingBand:
      rating === null
        ? null
        : rating >= 80
          ? 'HIGH_RESEARCH_PRIORITY'
          : rating >= 65
            ? 'REVIEW'
            : 'LOW_PRIORITY',
    confidence: {
      score: confidenceScore,
      level: confidenceScore >= 80 ? 'High' : confidenceScore >= 50 ? 'Medium' : 'Low',
    },
    completeness: {
      present: present + (feePolicyUsable ? 1 : 0),
      total: evidenceChecks.length + 1,
      missing,
    },
    gates,
    components,
    economics,
    evidenceChecks,
    algorithmVersion: SCORING_VERSION,
    isDemo: parsed.source.isDemo,
  };
}

/** A separate, explicitly synthetic fixture; never enriches the historical leads. */
export function createDemoSandbox(now = new Date().toISOString()): {
  product: Product;
  scenario: ScenarioInput;
} {
  const source = createProvenance({
    sourceType: 'demo',
    sourceUrlOrDocument: 'DEMO fixture document — no real supplier or sales',
    recordedAt: now,
    validAsOf: now,
    licenceBasis: 'Synthetic DEMO fixture only; not real marketplace evidence',
    permittedUses: ['catalogue', 'economics', 'demand', 'competition', 'scoring'],
    permission: 'approved',
    isDemo: true,
  });
  const record = (notes: string, extra: Partial<EvidenceRecord> = {}): EvidenceRecord => ({
    verified: true,
    source: { ...source },
    notes: `DEMO ONLY: ${notes}`,
    ...extra,
  });
  const evidence: ProductEvidence = {
    supplierPermission: record('Synthetic permission', { permissionDecision: 'approved' }),
    exactVariant: record('Synthetic exact identity'),
    cost: record('Synthetic supplier invoice including delivery and VAT'),
    safety: record('Synthetic low-risk review'),
    stock: record('Synthetic stock', { stockQuantity: 40 }),
    delivery: record('Synthetic delivery SLA', { deliveryDays: 3 }),
    returns: record('Synthetic returns path'),
    demand: record('Synthetic transactions, not actual marketplace sales', {
      sales30d: 45,
      sellerCount: 5,
      measurement: 'transactions_30d',
      marketplace: 'UK',
      packQuantity: 1,
      periodStart: new Date(Date.parse(now) - 30 * 86_400_000).toISOString(),
      periodEnd: now,
    }),
    competition: record('Synthetic competition, not actual market data', {
      activeExactOffers: 8,
      topSellerShareBps: 2_000,
    }),
  };
  const product: Product = {
    id: 'sandbox-synthetic-organiser',
    title: 'Synthetic desk organiser · DEMO ONLY',
    category: 'Synthetic sandbox',
    supplier: 'Fictional demo wholesaler',
    supplierSku: 'DEMO-SKU-001',
    variant: 'Synthetic single unit',
    packQuantity: 1,
    risk: 'low',
    historicalUnitCostPence: 600,
    historicalShippingPence: 200,
    historicalHandlingPence: 0,
    suggestedScenarioPricePence: 2_500,
    source,
    evidence,
    notes: ['Entirely synthetic and separate from the 20 historical leads.'],
  };
  return { product, scenario: { ...defaultScenario(product), supplierTaxIncluded: true } };
}

/** Exact identity never merges different variants or pack counts. */
export function isExactProductMatch(a: Product, b: Product): boolean {
  return (
    a.supplier === b.supplier &&
    a.supplierSku !== null &&
    a.supplierSku === b.supplierSku &&
    a.variant !== null &&
    a.variant === b.variant &&
    a.packQuantity !== null &&
    a.packQuantity === b.packQuantity
  );
}

export function marginToBps(contributionPence: number, revenuePence: number): number | null {
  return revenuePence > 0
    ? divideHalfUp(BigInt(contributionPence) * 10_000n, BigInt(revenuePence))
    : null;
}
