import { describe, expect, it } from 'vitest';
import {
  applyRate,
  calculateEconomics,
  calculateFees,
  calculateFinalValueFee,
  calculateFloatExposure,
  calculateScenarios,
  createDemoSandbox,
  createProvenance,
  defaultScenario,
  DEMO_FEE_POLICY,
  emptyEvidence,
  evaluateGates,
  evaluateProduct,
  feePolicySchema,
  findPriceThreshold,
  isExactProductMatch,
  meetsMargin,
  parseGbpToPence,
  parsePercentToBps,
  productSchema,
  scenarioInputSchema,
  type FeePolicy,
  type Product,
} from './index';

const NOW = '2026-10-16T10:00:00Z';
const noFees: FeePolicy = {
  ...DEMO_FEE_POLICY,
  id: 'demo-zero-fees',
  finalValueTiers: [{ upToPence: null, rateBps: 0 }],
  orderFeeRules: [{ upToPence: null, feePence: 0 }],
  regulatoryRateBps: 0,
  feeVatRateBps: 0,
  listingFeePence: 0,
};
const example = () => ({
  ...defaultScenario(),
  supplierShippingPence: 300,
  supplierHandlingPence: 40,
});

describe('controlled decimal money and rates', () => {
  it('parses pennies exactly without float multiplication', () => {
    expect(parseGbpToPence('19.99')).toBe(1999);
    expect(parseGbpToPence('0.29')).toBe(29);
    expect(parseGbpToPence(' 12.3 ')).toBe(1230);
    expect(parsePercentToBps('0.35')).toBe(35);
    expect(applyRate(1999, 1200)).toBe(240);
    expect(applyRate(1999, 35)).toBe(7);
  });

  it('rounds exact half pennies away from zero', () => {
    expect(applyRate(5, 1000)).toBe(1);
    expect(applyRate(-5, 1000)).toBe(-1);
    expect(applyRate(4, 1000)).toBe(0);
  });

  it.each(['', '-1', '1.001', '1e2', 'NaN', 'Infinity', '£2', '1,000', '01.00'])(
    'rejects ambiguous or invalid money %s',
    (value) => {
      expect(() => parseGbpToPence(value)).toThrow();
    },
  );

  it('rejects overflow and noninteger pence/rates', () => {
    expect(() => parseGbpToPence('999999999999999999.99')).toThrow();
    expect(() => applyRate(10.5, 100)).toThrow();
    expect(() => applyRate(10, 100.5)).toThrow();
    expect(() => parsePercentToBps('100.01')).toThrow();
  });
});

describe('fee schedules and UK contribution model', () => {
  it('reproduces the illustrative £20 example with exact component rounding', () => {
    const result = calculateEconomics(example());
    expect(result.landedCostPence).toBe(1240);
    expect(result.fees).toEqual({
      finalValueFeePence: 240,
      orderFeePence: 40,
      regulatoryFeePence: 7,
      listingFeePence: 30,
      marketplaceNetPence: 317,
      marketplaceVatPence: 63,
      marketplaceGrossPence: 380,
    });
    expect(result.advertisingPence).toBe(40);
    expect(result.returnsAllowancePence).toBe(60);
    expect(result.contributionPence).toBe(280);
    expect(result.marginBps).toBe(1400);
  });

  it('does not treat missing delivery as free or produce a verified margin', () => {
    const result = calculateEconomics({ ...example(), supplierShippingPence: null });
    expect(result.complete).toBe(false);
    expect(result.landedCostPence).toBeNull();
    expect(result.contributionPence).toBeNull();
    expect(result.marginBps).toBeNull();
    expect(result.missing.join(' ')).toContain('not free');
    expect(findPriceThreshold({ ...example(), supplierShippingPence: null })).toBeNull();
  });

  it('requires a known supplier VAT basis', () => {
    expect(calculateEconomics({ ...example(), supplierTaxIncluded: null }).complete).toBe(false);
  });

  it('distinguishes included and excluded supplier VAT quotes', () => {
    expect(calculateEconomics(example()).contributionPence).toBe(280);
    const excluded = calculateEconomics({ ...example(), supplierTaxIncluded: false });
    expect(excluded.supplierPaidPence).toBe(1488);
    expect(excluded.contributionPence).toBe(32);
  });

  it('keeps output VAT separate and recovers eligible input/service VAT in a registered scenario', () => {
    const result = calculateEconomics({ ...example(), vatRegistered: true });
    expect(result.outputVatPence).toBe(333);
    expect(result.revenueExVatPence).toBe(1667);
    expect(result.inputVatRecoveredPence).toBe(270);
    expect(result.landedCostPence).toBe(1033);
    expect(result.contributionPence).toBe(217);
    expect(
      calculateEconomics({ ...example(), vatRegistered: true, supplierVatRateBps: 0 })
        .outputVatPence,
    ).toBe(333);
  });

  it('uses progressive category tiers and rounds the total once', () => {
    const policy = {
      ...noFees,
      finalValueTiers: [
        { upToPence: 10_000, rateBps: 1000 },
        { upToPence: null, rateBps: 500 },
      ],
    };
    expect(calculateFinalValueFee(10_000, policy)).toBe(1000);
    expect(calculateFinalValueFee(20_000, policy)).toBe(1500);
    expect(calculateFinalValueFee(10_010, policy)).toBe(1001);
    const small = {
      ...noFees,
      finalValueTiers: [
        { upToPence: 5, rateBps: 1000 },
        { upToPence: null, rateBps: 1000 },
      ],
    };
    expect(calculateFinalValueFee(10, small)).toBe(1);
  });

  it('applies order thresholds inclusively and regulatory charge once to buyer revenue', () => {
    expect(
      calculateFees({ ...example(), sellingPricePence: 1000 }, DEMO_FEE_POLICY).orderFeePence,
    ).toBe(30);
    expect(
      calculateFees({ ...example(), sellingPricePence: 1001 }, DEMO_FEE_POLICY).orderFeePence,
    ).toBe(40);
    expect(
      calculateFees({ ...example(), buyerShippingPence: 1000 }, DEMO_FEE_POLICY).regulatoryFeePence,
    ).toBe(11);
  });

  it('allocates quantities and recurring listing charges explicitly', () => {
    const result = calculateEconomics({
      ...example(),
      quantity: 3,
      expectedUnitsSold: 10,
      renewalPeriods: 1,
      sellingPricePence: 6000,
    });
    expect(result.landedCostPence).toBe(3040);
    expect(result.fees.listingFeePence).toBe(18);
    expect(result.fees.marketplaceGrossPence).toBe(959);
    expect(result.contributionPence).toBe(1701);
  });

  it('stress can turn a positive base contribution negative; no supplier discount is invented', () => {
    const scenarios = calculateScenarios(example());
    expect(scenarios.base.contributionPence).toBe(280);
    expect(scenarios.stress.contributionPence).toBe(-3);
    expect(scenarios.stressWarning).toBe(true);
    expect(scenarios.optimisticInput.supplierUnitCostPence).toBe(example().supplierUnitCostPence);
    expect(scenarios.optimisticInput.supplierShippingPence).toBe(300);
  });

  it('preserves £19.99 economics exactly', () => {
    const result = calculateEconomics({ ...example(), sellingPricePence: 1999 });
    expect(result.contributionPence).toBe(279);
  });

  it('validates fee boundaries, negative values and unsupported quantity allocation', () => {
    expect(
      feePolicySchema.safeParse({
        ...noFees,
        finalValueTiers: [
          { upToPence: null, rateBps: 100 },
          { upToPence: 500, rateBps: 200 },
        ],
      }).success,
    ).toBe(false);
    expect(
      feePolicySchema.safeParse({ ...noFees, orderFeeRules: [{ upToPence: 100, feePence: 20 }] })
        .success,
    ).toBe(false);
    expect(scenarioInputSchema.safeParse({ ...example(), supplierUnitCostPence: -1 }).success).toBe(
      false,
    );
    expect(
      scenarioInputSchema.safeParse({ ...example(), quantity: 2, expectedUnitsSold: 1 }).success,
    ).toBe(false);
  });

  it('retains old outputs when the offer or fee policy is replaced', () => {
    const original = calculateEconomics(example());
    const updated = calculateEconomics(
      { ...example(), supplierUnitCostPence: 1000 },
      { ...DEMO_FEE_POLICY, id: 'demo-policy-v2', listingFeePence: 60 },
    );
    expect(original.contributionPence).toBe(280);
    expect(original.policyId).toBe('demo-uk-fees-2026-10-16-v1');
    expect(updated.contributionPence).toBe(144);
  });
});

describe('bounded minimum-price solver and working capital', () => {
  it('aggregates concurrent supplier exposure across products without hiding unknown orders', () => {
    expect(
      calculateFloatExposure([
        { supplierPaidPence: 1000, concurrentOrders: 10 },
        { supplierPaidPence: 2000, concurrentOrders: 12 },
      ]),
    ).toMatchObject({ exposurePence: 39000, availablePence: -4000, exceedsBudget: true });
    expect(
      calculateFloatExposure([{ supplierPaidPence: null, concurrentOrders: 0 }], 5000, 35000)
        .exposurePence,
    ).toBe(5000);
  });
  it('requires absolute contribution AND exact margin', () => {
    const input = {
      ...example(),
      supplierUnitCostPence: 2000,
      supplierShippingPence: 0,
      supplierHandlingPence: 0,
      advertisingRateBps: 0,
      returnsRateBps: 0,
    };
    expect(
      findPriceThreshold(input, noFees, { minContributionPence: 400, minMarginBps: 2000 }, 3000),
    ).toBe(2500);
    expect(
      findPriceThreshold(input, noFees, { minContributionPence: 0, minMarginBps: 0 }, 3000),
    ).toBe(2000);
    expect(
      findPriceThreshold(input, noFees, { minContributionPence: 400, minMarginBps: 2000 }, 2499),
    ).toBeNull();
  });

  it('finds the first valid penny before a nonmonotone order-fee jump', () => {
    const input = {
      ...example(),
      supplierUnitCostPence: 800,
      supplierShippingPence: 0,
      supplierHandlingPence: 0,
      advertisingRateBps: 0,
      returnsRateBps: 0,
    };
    const policy = {
      ...noFees,
      orderFeeRules: [
        { upToPence: 1000, feePence: 0 },
        { upToPence: null, feePence: 10_000 },
      ],
    };
    expect(
      findPriceThreshold(input, policy, { minContributionPence: 100, minMarginBps: 0 }, 3000),
    ).toBe(900);
  });

  it('never passes a margin because its displayed percentage rounds up', () => {
    const result = calculateEconomics(
      {
        ...example(),
        sellingPricePence: 10001,
        supplierUnitCostPence: 8001,
        supplierShippingPence: 0,
        supplierHandlingPence: 0,
        advertisingRateBps: 0,
        returnsRateBps: 0,
      },
      noFees,
    );
    expect(result.marginBps).toBe(2000);
    expect(meetsMargin(result, 2000)).toBe(false);
  });

  it('reports portfolio reserve, known payments and unknown exposure', () => {
    expect(calculateFloatExposure([{ supplierPaidPence: 1240, concurrentOrders: 20 }])).toEqual({
      exposurePence: 29800,
      availablePence: 5200,
      exceedsBudget: false,
      missing: [],
    });
    expect(
      calculateFloatExposure([{ supplierPaidPence: 1240, concurrentOrders: 30 }]).exceedsBudget,
    ).toBe(true);
    expect(
      calculateFloatExposure([{ supplierPaidPence: null, concurrentOrders: 1 }]).exposurePence,
    ).toBeNull();
    expect(() =>
      calculateFloatExposure([{ supplierPaidPence: 100, concurrentOrders: -1 }]),
    ).toThrow();
  });
});

describe('evidence eligibility, provenance and independent hard gates', () => {
  const demo = () => createDemoSandbox(NOW);

  it('withholds seed ratings and never turns historical supplier prices into verified offers', () => {
    const { product } = demo();
    const seed: Product = {
      ...product,
      id: 'lead-001',
      supplierSku: null,
      variant: null,
      packQuantity: null,
      source: createProvenance({ sourceType: 'historical_lead' }),
      evidence: emptyEvidence(),
    };
    const result = evaluateProduct(seed, defaultScenario(seed), NOW);
    expect(result.rating).toBeNull();
    expect(result.status).toBe('RESEARCH_NEEDED');
    expect(result.components).toEqual([]);
    expect(result.completeness.present).toBe(0);
    expect(result.gates.filter((entry) => !entry.passed).length).toBeGreaterThan(0);
  });

  it('scores only the separate complete synthetic sandbox with transparent components', () => {
    const { product, scenario } = demo();
    const result = evaluateProduct(product, scenario, NOW);
    expect(result.rating).toBeGreaterThan(80);
    expect(result.components).toHaveLength(5);
    expect(result.components.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    expect(result.status).toBe('APPROVED_FOR_REVIEW');
    expect(result.isDemo).toBe(true);
    expect(result.completeness).toMatchObject({ present: 10, total: 10, missing: [] });
  });

  it('no demand produces null rather than zero or a fabricated rating', () => {
    const { product, scenario } = demo();
    product.evidence.demand = null;
    const result = evaluateProduct(product, scenario, NOW);
    expect(result.rating).toBeNull();
    expect(result.components).toEqual([]);
    expect(result.gates.find((entry) => entry.code === 'DEMAND')?.passed).toBe(false);
  });

  it.each(['asking_price', 'cumulative_sold'] as const)(
    'rejects %s as 30-day transactions',
    (measurement) => {
      const { product, scenario } = demo();
      product.evidence.demand!.measurement = measurement;
      expect(evaluateProduct(product, scenario, NOW).rating).toBeNull();
    },
  );

  it('requires a real observation period and identical pack quantity', () => {
    const { product, scenario } = demo();
    delete product.evidence.demand!.periodStart;
    expect(evaluateProduct(product, scenario, NOW).rating).toBeNull();
    const second = demo();
    second.product.evidence.demand!.packQuantity = 2;
    expect(evaluateProduct(second.product, second.scenario, NOW).rating).toBeNull();
  });

  it('fails closed for licensed-use blocks, expirations and disabled eBay API analytics', () => {
    const { product, scenario } = demo();
    product.evidence.demand!.source.permission = 'blocked';
    expect(evaluateProduct(product, scenario, NOW)).toMatchObject({
      rating: null,
      status: 'BLOCKED',
    });
    const expired = demo();
    expired.product.evidence.demand!.source.expiresAt = NOW;
    expect(evaluateProduct(expired.product, expired.scenario, NOW).rating).toBeNull();
    const ebay = demo();
    ebay.product.evidence.demand!.source.provider = 'ebay_api';
    expect(evaluateProduct(ebay.product, ebay.scenario, NOW)).toMatchObject({
      rating: null,
      status: 'BLOCKED',
    });
  });

  it('stale cost, stock and transactions withhold the rating and approval', () => {
    for (const key of ['stock', 'cost', 'demand'] as const) {
      const { product, scenario } = demo();
      product.evidence[key]!.source.validAsOf = '2026-09-01T00:00:00Z';
      const result = evaluateProduct(product, scenario, NOW);
      expect(result.rating).toBeNull();
      expect(result.status).not.toBe('APPROVED_FOR_REVIEW');
    }
  });

  it('high complete scores cannot override rejected supplier permission or high-risk safety', () => {
    const { product, scenario } = demo();
    product.evidence.supplierPermission!.permissionDecision = 'rejected';
    const rejected = evaluateProduct(product, scenario, NOW);
    expect(rejected.rating).toBeGreaterThanOrEqual(80);
    expect(rejected.status).toBe('BLOCKED');
    expect(rejected.gates.find((entry) => entry.code === 'SUPPLIER_PERMISSION')?.passed).toBe(
      false,
    );
    const unsafe = demo();
    unsafe.product.risk = 'high';
    expect(evaluateProduct(unsafe.product, unsafe.scenario, NOW)).toMatchObject({
      status: 'BLOCKED',
    });
  });

  it('unverified permission blocks even after a previously high synthetic score', () => {
    const { product, scenario } = demo();
    expect(evaluateProduct(product, scenario, NOW).rating).toBeGreaterThanOrEqual(90);
    product.evidence.supplierPermission!.verified = false;
    expect(evaluateProduct(product, scenario, NOW)).toMatchObject({
      rating: null,
      status: 'BLOCKED',
    });
  });

  it('uses both independent margin and contribution gates, even if evidence is complete', () => {
    const { product } = demo();
    const result = evaluateGates(product, calculateEconomics(example()), NOW);
    expect(result.find((entry) => entry.code === 'MIN_CONTRIBUTION')?.passed).toBe(false);
    expect(result.find((entry) => entry.code === 'MIN_MARGIN')?.passed).toBe(false);
    const marginOnly = evaluateGates(
      product,
      calculateEconomics(
        {
          ...example(),
          sellingPricePence: 1500,
          supplierUnitCostPence: 1200,
          supplierShippingPence: 0,
          supplierHandlingPence: 0,
          advertisingRateBps: 0,
          returnsRateBps: 0,
        },
        noFees,
      ),
      NOW,
      noFees,
    );
    expect(marginOnly.find((entry) => entry.code === 'MIN_CONTRIBUTION')?.passed).toBe(false);
    expect(marginOnly.find((entry) => entry.code === 'MIN_MARGIN')?.passed).toBe(true);
    const profitOnly = evaluateGates(
      product,
      calculateEconomics(
        {
          ...example(),
          sellingPricePence: 10000,
          supplierUnitCostPence: 9500,
          supplierShippingPence: 0,
          supplierHandlingPence: 0,
          advertisingRateBps: 0,
          returnsRateBps: 0,
        },
        noFees,
      ),
      NOW,
      noFees,
    );
    expect(profitOnly.find((entry) => entry.code === 'MIN_CONTRIBUTION')?.passed).toBe(true);
    expect(profitOnly.find((entry) => entry.code === 'MIN_MARGIN')?.passed).toBe(false);
  });

  it('cannot apply synthetic evidence to a historical seed or approve real research with demo fees', () => {
    const { product, scenario } = demo();
    product.id = 'historical-001';
    expect(evaluateProduct(product, scenario, NOW).rating).toBeNull();
    const real = demo();
    real.product.id = 'real-001';
    real.product.source.isDemo = false;
    real.product.source.sourceType = 'user_entered';
    for (const entry of Object.values(real.product.evidence)) {
      entry!.source.isDemo = false;
      entry!.source.sourceType = 'user_entered';
    }
    const result = evaluateProduct(real.product, real.scenario, NOW);
    expect(result.rating).toBeNull();
    expect(result.status).not.toBe('APPROVED_FOR_REVIEW');
    expect(result.gates.find((entry) => entry.code === 'FEE_POLICY')?.passed).toBe(false);
  });

  it('does not merge products with different packs, unknown identity or different variants', () => {
    const { product } = demo();
    expect(isExactProductMatch(product, { ...product })).toBe(true);
    expect(isExactProductMatch(product, { ...product, packQuantity: 3 })).toBe(false);
    expect(isExactProductMatch(product, { ...product, variant: 'Other variant' })).toBe(false);
    expect(isExactProductMatch(product, { ...product, supplierSku: null })).toBe(false);
  });

  it('rejects malformed product records at the external boundary', () => {
    const { product } = demo();
    expect(productSchema.safeParse({ ...product, historicalUnitCostPence: 1.99 }).success).toBe(
      false,
    );
    expect(productSchema.safeParse({ ...product, unexpected: true }).success).toBe(false);
  });
});
