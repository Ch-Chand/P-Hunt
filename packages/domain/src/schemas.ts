import { z } from 'zod';

export const penceSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const rateBpsSchema = z.number().int().min(0).max(10_000);
const nullableDate = z.string().datetime({ offset: true }).nullable();

export const provenanceSchema = z
  .object({
    sourceType: z.enum([
      'historical_lead',
      'user_entered',
      'verified_supplier_feed',
      'authorised_provider',
      'demo',
    ]),
    sourceUrlOrDocument: z.string().min(1).nullable(),
    recordedAt: nullableDate,
    validAsOf: nullableDate,
    capturedBy: z.string().min(1),
    licenceBasis: z.string().min(1).nullable(),
    sourceRecordId: z.string().nullable(),
    permittedUses: z.array(z.enum(['catalogue', 'economics', 'demand', 'competition', 'scoring'])),
    permission: z.enum(['approved', 'manual_only', 'pending', 'blocked']),
    isDemo: z.boolean(),
    expiresAt: nullableDate,
    provider: z.enum(['ebay_api', 'other']).optional(),
  })
  .strict();
export type Provenance = z.infer<typeof provenanceSchema>;

export const evidenceRecordSchema = z
  .object({
    verified: z.boolean(),
    source: provenanceSchema,
    notes: z.string(),
    stockQuantity: z.number().int().nonnegative().optional(),
    deliveryDays: z.number().int().nonnegative().optional(),
    sales30d: z.number().int().nonnegative().optional(),
    sellerCount: z.number().int().nonnegative().optional(),
    activeExactOffers: z.number().int().nonnegative().optional(),
    topSellerShareBps: rateBpsSchema.optional(),
    measurement: z.enum(['transactions_30d', 'asking_price', 'cumulative_sold']).optional(),
    marketplace: z.enum(['UK', 'other']).optional(),
    packQuantity: z.number().int().positive().optional(),
    permissionDecision: z.enum(['approved', 'pending', 'rejected']).optional(),
    periodStart: z.string().datetime({ offset: true }).optional(),
    periodEnd: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export const productEvidenceSchema = z
  .object({
    supplierPermission: evidenceRecordSchema.nullable(),
    exactVariant: evidenceRecordSchema.nullable(),
    cost: evidenceRecordSchema.nullable(),
    safety: evidenceRecordSchema.nullable(),
    stock: evidenceRecordSchema.nullable(),
    delivery: evidenceRecordSchema.nullable(),
    returns: evidenceRecordSchema.nullable(),
    demand: evidenceRecordSchema.nullable(),
    competition: evidenceRecordSchema.nullable(),
  })
  .strict();
export type ProductEvidence = z.infer<typeof productEvidenceSchema>;
export type EvidenceKey = keyof ProductEvidence;

export const productSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    category: z.string().min(1),
    supplier: z.string().min(1),
    supplierSku: z.string().min(1).nullable(),
    variant: z.string().min(1).nullable(),
    packQuantity: z.number().int().positive().nullable(),
    risk: z.enum(['low', 'medium', 'high', 'unknown']),
    historicalUnitCostPence: penceSchema.nullable(),
    historicalShippingPence: penceSchema.nullable(),
    historicalHandlingPence: penceSchema.nullable(),
    suggestedScenarioPricePence: penceSchema.nullable(),
    source: provenanceSchema,
    evidence: productEvidenceSchema,
    notes: z.array(z.string()),
  })
  .strict();
export type Product = z.infer<typeof productSchema>;

export function emptyEvidence(): ProductEvidence {
  return {
    supplierPermission: null,
    exactVariant: null,
    cost: null,
    safety: null,
    stock: null,
    delivery: null,
    returns: null,
    demand: null,
    competition: null,
  };
}

export function createProvenance(overrides: Partial<Provenance> = {}): Provenance {
  return provenanceSchema.parse({
    sourceType: 'demo',
    sourceUrlOrDocument: null,
    recordedAt: null,
    validAsOf: null,
    capturedBy: 'Demo fixture',
    licenceBasis: null,
    sourceRecordId: null,
    permittedUses: [],
    permission: 'pending',
    isDemo: true,
    expiresAt: null,
    ...overrides,
  });
}

export const scenarioInputSchema = z
  .object({
    sellingPricePence: penceSchema,
    buyerShippingPence: penceSchema,
    supplierUnitCostPence: penceSchema.nullable(),
    supplierShippingPence: penceSchema.nullable(),
    supplierHandlingPence: penceSchema,
    supplierTaxIncluded: z.boolean().nullable(),
    supplierVatRateBps: rateBpsSchema,
    outputVatRateBps: rateBpsSchema,
    packagingPence: penceSchema,
    otherVariableCostsPence: penceSchema,
    advertisingRateBps: rateBpsSchema,
    returnsRateBps: rateBpsSchema,
    vatRegistered: z.boolean(),
    quantity: z.number().int().min(1).max(100_000),
    expectedUnitsSold: z.number().int().min(1).max(1_000_000),
    renewalPeriods: z.number().int().min(0).max(120),
    assumptionsVersion: z.string().min(1),
  })
  .strict()
  .refine((input) => input.expectedUnitsSold >= input.quantity, {
    path: ['expectedUnitsSold'],
    message: 'Expected listing units must cover units in this order.',
  });
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;

const tierSchema = z.object({ upToPence: penceSchema.nullable(), rateBps: rateBpsSchema }).strict();
const orderRuleSchema = z
  .object({ upToPence: penceSchema.nullable(), feePence: penceSchema })
  .strict();
export const feePolicySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    effectiveFrom: z.string().datetime({ offset: true }),
    verifiedOn: nullableDate,
    isDemo: z.boolean(),
    sourceUrl: z.string().url(),
    finalValueTiers: z.array(tierSchema).min(1),
    orderFeeRules: z.array(orderRuleSchema).min(1),
    regulatoryRateBps: rateBpsSchema,
    feeVatRateBps: rateBpsSchema,
    listingFeePence: penceSchema,
    listingUpgradePence: penceSchema,
  })
  .strict()
  .superRefine((policy, context) => {
    for (const key of ['finalValueTiers', 'orderFeeRules'] as const) {
      const entries = policy[key];
      let previous = -1;
      for (const [index, entry] of entries.entries()) {
        if (entry.upToPence === null) {
          if (index !== entries.length - 1)
            context.addIssue({
              code: 'custom',
              path: [key, index],
              message: 'Open-ended rule must be last.',
            });
        } else {
          if (entry.upToPence <= previous)
            context.addIssue({
              code: 'custom',
              path: [key, index],
              message: 'Tier limits must strictly increase.',
            });
          previous = entry.upToPence;
        }
      }
      if (entries.at(-1)?.upToPence !== null)
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'A final open-ended rule is required.',
        });
    }
  });
export type FeePolicy = z.infer<typeof feePolicySchema>;

export const DEFAULT_THRESHOLDS = {
  minContributionPence: 400,
  minMarginBps: 2_000,
  minSales30d: 15,
  minSellers: 3,
  maxDeliveryDays: 5,
  minStockQuantity: 1,
} as const;
export const thresholdsSchema = z
  .object({
    minContributionPence: penceSchema,
    minMarginBps: rateBpsSchema,
    minSales30d: z.number().int().nonnegative(),
    minSellers: z.number().int().positive(),
    maxDeliveryDays: z.number().int().nonnegative(),
    minStockQuantity: z.number().int().positive(),
  })
  .strict();
export type Thresholds = z.infer<typeof thresholdsSchema>;
