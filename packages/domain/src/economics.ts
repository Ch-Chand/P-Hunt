import { applyRate, assertSafeInteger, divideHalfUp } from './money';
import {
  DEFAULT_THRESHOLDS,
  feePolicySchema,
  scenarioInputSchema,
  type FeePolicy,
  type Product,
  type ScenarioInput,
} from './schemas';

export const DEMO_FEE_POLICY: FeePolicy = feePolicySchema.parse({
  id: 'demo-uk-fees-2026-10-16-v1',
  name: 'ILLUSTRATIVE UK fee assumptions · not verified',
  effectiveFrom: '2026-10-16T00:00:00Z',
  verifiedOn: null,
  isDemo: true,
  sourceUrl: 'https://www.ebay.co.uk/help/selling/fees-credits-invoices/store-selling-fees?id=4809',
  finalValueTiers: [{ upToPence: null, rateBps: 1_200 }],
  orderFeeRules: [
    { upToPence: 1_000, feePence: 30 },
    { upToPence: null, feePence: 40 },
  ],
  regulatoryRateBps: 35,
  feeVatRateBps: 2_000,
  listingFeePence: 30,
  listingUpgradePence: 0,
});

export interface FeeBreakdown {
  finalValueFeePence: number;
  orderFeePence: number;
  regulatoryFeePence: number;
  listingFeePence: number;
  marketplaceNetPence: number;
  marketplaceVatPence: number;
  marketplaceGrossPence: number;
}

export interface EconomicsResult {
  complete: boolean;
  missing: string[];
  revenuePence: number;
  revenueExVatPence: number;
  landedCostPence: number | null;
  supplierPaidPence: number | null;
  contributionPence: number | null;
  marginBps: number | null;
  fees: FeeBreakdown;
  advertisingPence: number;
  returnsAllowancePence: number;
  outputVatPence: number;
  inputVatRecoveredPence: number;
  policyId: string;
  assumptionsVersion: string;
  limitations: string[];
}

function addSafe(...values: number[]): number {
  return assertSafeInteger(values.reduce((sum, value) => sum + value, 0));
}

/** Marginal, progressive tiers; sum exact tier rationals, then round once. */
function finalValueFeeParsed(revenuePence: number, policy: FeePolicy): number {
  assertSafeInteger(revenuePence);
  if (revenuePence < 0) throw new RangeError('Revenue cannot be negative.');
  let previous = 0;
  let numerator = 0n;
  for (const tier of policy.finalValueTiers) {
    const end = tier.upToPence === null ? revenuePence : Math.min(tier.upToPence, revenuePence);
    const slice = Math.max(0, end - previous);
    numerator += BigInt(slice) * BigInt(tier.rateBps);
    previous = end;
    if (end >= revenuePence) break;
  }
  return divideHalfUp(numerator, 10_000n);
}

export function calculateFinalValueFee(revenuePence: number, policy: FeePolicy): number {
  return finalValueFeeParsed(revenuePence, feePolicySchema.parse(policy));
}

function feesParsed(input: ScenarioInput, policy: FeePolicy): FeeBreakdown {
  const revenuePence = addSafe(input.sellingPricePence, input.buyerShippingPence);
  const finalValueFeePence = finalValueFeeParsed(revenuePence, policy);
  const orderFeePence = policy.orderFeeRules.find(
    (rule) => rule.upToPence === null || revenuePence <= rule.upToPence,
  )?.feePence;
  if (orderFeePence === undefined)
    throw new Error('Fee policy must include an open-ended order rule.');
  const regulatoryFeePence = applyRate(revenuePence, policy.regulatoryRateBps);
  // The listing charge recurs each renewal period, apportioned to units sold.
  const listingFeePence = divideHalfUp(
    BigInt(addSafe(policy.listingFeePence, policy.listingUpgradePence)) *
      BigInt(input.renewalPeriods + 1) *
      BigInt(input.quantity),
    BigInt(input.expectedUnitsSold),
  );
  const marketplaceNetPence = addSafe(
    finalValueFeePence,
    orderFeePence,
    regulatoryFeePence,
    listingFeePence,
  );
  const marketplaceVatPence = applyRate(marketplaceNetPence, policy.feeVatRateBps);
  return {
    finalValueFeePence,
    orderFeePence,
    regulatoryFeePence,
    listingFeePence,
    marketplaceNetPence,
    marketplaceVatPence,
    marketplaceGrossPence: addSafe(marketplaceNetPence, marketplaceVatPence),
  };
}

export function calculateFees(input: ScenarioInput, policy: FeePolicy): FeeBreakdown {
  return feesParsed(scenarioInputSchema.parse(input), feePolicySchema.parse(policy));
}

function calculateParsed(input: ScenarioInput, policy: FeePolicy): EconomicsResult {
  const revenuePence = addSafe(input.sellingPricePence, input.buyerShippingPence);
  const fees = feesParsed(input, policy);
  const advertisingPence = applyRate(revenuePence, input.advertisingRateBps);
  const returnsAllowancePence = applyRate(revenuePence, input.returnsRateBps);
  const outputVatPence = input.vatRegistered
    ? divideHalfUp(
        BigInt(revenuePence) * BigInt(input.outputVatRateBps),
        BigInt(10_000 + input.outputVatRateBps),
      )
    : 0;
  const revenueExVatPence = revenuePence - outputVatPence;
  const missing = [
    ...(input.supplierUnitCostPence === null ? ['Supplier unit cost is not verified'] : []),
    ...(input.supplierShippingPence === null
      ? ['Supplier delivery cost is unknown; it is not free']
      : []),
    ...(input.supplierTaxIncluded === null ? ['Supplier VAT treatment is unknown'] : []),
  ];
  const common = {
    complete: missing.length === 0,
    missing,
    revenuePence,
    revenueExVatPence,
    fees,
    advertisingPence,
    returnsAllowancePence,
    outputVatPence,
    policyId: policy.id,
    assumptionsVersion: input.assumptionsVersion,
    limitations: [
      'Contribution before overhead and income tax; not a sales forecast.',
      'Supplier unit, shipping and handling share the selected supplier VAT basis. Packaging/other costs are gross without input VAT recovery.',
      'Advertising and return loss are modeled allowances based on gross buyer revenue.',
      ...(policy.isDemo
        ? [
            'Fee policy is illustrative DEMO data; verify current official category fees before real decisions.',
          ]
        : []),
    ],
  };
  if (
    input.supplierUnitCostPence === null ||
    input.supplierShippingPence === null ||
    input.supplierTaxIncluded === null
  ) {
    return {
      ...common,
      landedCostPence: null,
      supplierPaidPence: null,
      contributionPence: null,
      marginBps: null,
      inputVatRecoveredPence: 0,
    };
  }
  const quotedSupplierTotal = addSafe(
    assertSafeInteger(input.supplierUnitCostPence * input.quantity),
    input.supplierShippingPence,
    input.supplierHandlingPence,
  );
  const supplierVatPence = input.supplierTaxIncluded
    ? divideHalfUp(
        BigInt(quotedSupplierTotal) * BigInt(input.supplierVatRateBps),
        BigInt(10_000 + input.supplierVatRateBps),
      )
    : applyRate(quotedSupplierTotal, input.supplierVatRateBps);
  const supplierPaidPence = input.supplierTaxIncluded
    ? quotedSupplierTotal
    : addSafe(quotedSupplierTotal, supplierVatPence);
  const inputVatRecoveredPence = input.vatRegistered
    ? addSafe(supplierVatPence, fees.marketplaceVatPence)
    : 0;
  const supplierEconomicCost = supplierPaidPence - (input.vatRegistered ? supplierVatPence : 0);
  const landedCostPence = addSafe(supplierEconomicCost, input.packagingPence);
  const feeEconomicCost = input.vatRegistered
    ? fees.marketplaceNetPence
    : fees.marketplaceGrossPence;
  const contributionPence = assertSafeInteger(
    revenueExVatPence -
      landedCostPence -
      feeEconomicCost -
      advertisingPence -
      returnsAllowancePence -
      input.otherVariableCostsPence,
  );
  // Registered scenarios compare contribution with revenue excluding output VAT.
  const marginBps =
    revenueExVatPence > 0
      ? divideHalfUp(BigInt(contributionPence) * 10_000n, BigInt(revenueExVatPence))
      : null;
  return {
    ...common,
    landedCostPence,
    supplierPaidPence,
    contributionPence,
    marginBps,
    inputVatRecoveredPence,
  };
}

export function calculateEconomics(
  input: ScenarioInput,
  policy: FeePolicy = DEMO_FEE_POLICY,
): EconomicsResult {
  return calculateParsed(scenarioInputSchema.parse(input), feePolicySchema.parse(policy));
}

export function defaultScenario(product?: Product): ScenarioInput {
  return {
    sellingPricePence: product?.suggestedScenarioPricePence ?? 2_000,
    buyerShippingPence: 0,
    supplierUnitCostPence: product ? product.historicalUnitCostPence : 900,
    supplierShippingPence: product ? product.historicalShippingPence : null,
    supplierHandlingPence: product?.historicalHandlingPence ?? 0,
    supplierTaxIncluded: product ? null : true,
    supplierVatRateBps: 2_000,
    outputVatRateBps: 2_000,
    packagingPence: 0,
    otherVariableCostsPence: 0,
    advertisingRateBps: 200,
    returnsRateBps: 300,
    vatRegistered: false,
    quantity: 1,
    expectedUnitsSold: 1,
    renewalPeriods: 0,
    assumptionsVersion: 'manual-demo-scenario-v1',
  };
}

export interface ScenarioSet {
  base: EconomicsResult;
  stress: EconomicsResult;
  optimistic: EconomicsResult;
  stressInput: ScenarioInput;
  optimisticInput: ScenarioInput;
  stressWarning: boolean;
  optimisticNote: string;
}

export function calculateScenarios(
  input: ScenarioInput,
  policy: FeePolicy = DEMO_FEE_POLICY,
): ScenarioSet {
  const parsed = scenarioInputSchema.parse(input);
  const stressInput: ScenarioInput = {
    ...parsed,
    sellingPricePence: applyRate(parsed.sellingPricePence, 9_000),
    supplierShippingPence:
      parsed.supplierShippingPence === null
        ? null
        : divideHalfUp(BigInt(parsed.supplierShippingPence) * 12n, 10n),
    returnsRateBps: Math.min(10_000, divideHalfUp(BigInt(parsed.returnsRateBps) * 15n, 10n)),
    renewalPeriods: Math.min(120, parsed.renewalPeriods + 1),
  };
  // The optimistic scenario may reduce a manual loss allowance. It never invents
  // a discounted supplier quote, free delivery or evidence-backed selling price.
  const optimisticInput: ScenarioInput = {
    ...parsed,
    returnsRateBps: divideHalfUp(BigInt(parsed.returnsRateBps), 2n),
  };
  const base = calculateEconomics(parsed, policy);
  const stress = calculateEconomics(stressInput, policy);
  return {
    base,
    stress,
    optimistic: calculateEconomics(optimisticInput, policy),
    stressInput,
    optimisticInput,
    stressWarning:
      stress.contributionPence !== null &&
      (stress.contributionPence < DEFAULT_THRESHOLDS.minContributionPence ||
        !meetsMargin(stress, DEFAULT_THRESHOLDS.minMarginBps)),
    optimisticNote:
      'Hypothetical lower returns allowance only; supplier costs and selling price unchanged. No negotiated quote is assumed.',
  };
}

/** Compare the exact ratio, never the rounded percentage displayed in the UI. */
export function meetsMargin(result: EconomicsResult, minMarginBps: number): boolean {
  return (
    result.contributionPence !== null &&
    result.revenueExVatPence > 0 &&
    BigInt(result.contributionPence) * 10_000n >=
      BigInt(result.revenueExVatPence) * BigInt(minMarginBps)
  );
}

export interface PriceThresholds {
  minContributionPence: number;
  minMarginBps: number;
}

/**
 * Bounded exhaustive pence search guarantees the *smallest* price even around
 * fixed-order-fee jumps and coincident half-up rounding boundaries. Binary search
 * is unsafe for arbitrary user-defined fee schedules. No marketplace inputs.
 */
export function findPriceThreshold(
  input: ScenarioInput,
  policy: FeePolicy = DEMO_FEE_POLICY,
  thresholds: PriceThresholds = DEFAULT_THRESHOLDS,
  maxSellingPricePence = 100_000,
): number | null {
  const parsed = scenarioInputSchema.parse(input);
  const parsedPolicy = feePolicySchema.parse(policy);
  if (
    !Number.isSafeInteger(maxSellingPricePence) ||
    maxSellingPricePence < 0 ||
    maxSellingPricePence > 1_000_000
  )
    throw new RangeError('Search limit must be 0–1,000,000 pence.');
  if (
    !Number.isSafeInteger(thresholds.minContributionPence) ||
    thresholds.minContributionPence < 0 ||
    !Number.isSafeInteger(thresholds.minMarginBps) ||
    thresholds.minMarginBps < 0 ||
    thresholds.minMarginBps > 10_000
  )
    throw new RangeError('Invalid financial thresholds.');
  if (
    parsed.supplierUnitCostPence === null ||
    parsed.supplierShippingPence === null ||
    parsed.supplierTaxIncluded === null
  )
    return null;
  for (
    let sellingPricePence = 0;
    sellingPricePence <= maxSellingPricePence;
    sellingPricePence += 1
  ) {
    const result = calculateParsed({ ...parsed, sellingPricePence }, parsedPolicy);
    if (
      result.contributionPence !== null &&
      result.contributionPence >= thresholds.minContributionPence &&
      ((thresholds.minMarginBps === 0 && result.revenueExVatPence === 0) ||
        meetsMargin(result, thresholds.minMarginBps))
    )
      return sellingPricePence;
  }
  return null;
}

export function calculateFloatExposure(
  orders: Array<{ supplierPaidPence: number | null; concurrentOrders: number }>,
  reservePence = 5_000,
  budgetPence = 35_000,
): {
  exposurePence: number | null;
  availablePence: number | null;
  exceedsBudget: boolean | null;
  missing: string[];
} {
  for (const value of [reservePence, budgetPence])
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError('Reserve/budget must be non-negative integer pence.');
  for (const order of orders) {
    if (!Number.isSafeInteger(order.concurrentOrders) || order.concurrentOrders < 0)
      throw new RangeError('Order counts must be non-negative integers.');
    if (
      order.supplierPaidPence !== null &&
      (!Number.isSafeInteger(order.supplierPaidPence) || order.supplierPaidPence < 0)
    )
      throw new RangeError('Supplier payments must be non-negative integer pence.');
  }
  if (orders.some((order) => order.supplierPaidPence === null && order.concurrentOrders > 0))
    return {
      exposurePence: null,
      availablePence: null,
      exceedsBudget: null,
      missing: ['A supplier payment is unknown; portfolio float cannot be verified.'],
    };
  const exposurePence = orders.reduce(
    (sum, order) =>
      addSafe(sum, assertSafeInteger((order.supplierPaidPence ?? 0) * order.concurrentOrders)),
    reservePence,
  );
  return {
    exposurePence,
    availablePence: budgetPence - exposurePence,
    exceedsBudget: exposurePence > budgetPence,
    missing: [],
  };
}
