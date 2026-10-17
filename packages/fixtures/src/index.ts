import {
  createProvenance,
  emptyEvidence,
  parseGbpToPence,
  productSchema,
  type Product,
} from '@research/domain';
import { z } from 'zod';
import historicalRows from './leads.demo.json';

const historicalMoneyText = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);
const optionalHistoricalMoneyText = z.union([z.literal(''), historicalMoneyText]);

/** The checked-in source preserves the historical CSV's literal values, including blanks. */
export const historicalLeadRowSchema = z
  .object({
    product_name: z.string().min(1),
    supplier: z.string().min(1),
    supplier_url: z.string(),
    supplier_sku: z.string(),
    supplier_cost: historicalMoneyText,
    shipping_cost: optionalHistoricalMoneyText,
    handling_cost: optionalHistoricalMoneyText,
    target_sell_price: optionalHistoricalMoneyText,
    category_fee_pct: z.string(),
    sold_30d: z.string(),
    active_matching_listings: z.string(),
    sellers_with_sales_30d: z.string(),
    evidence_date: z.string(),
    evidence_source: z.string(),
    stock_qty: z.string(),
    supplier_reliability_0_100: z.string(),
    supplier_permission_confirmed: z.literal('no'),
    sample_tested: z.literal('no'),
    risk_level: z.enum(['', 'low']),
  })
  .strict();

export const demoLeadRows = z.array(historicalLeadRowSchema).length(20).parse(historicalRows);
export type HistoricalLeadRow = z.infer<typeof historicalLeadRowSchema>;

const displayCategories = [
  'Tools',
  'Home & storage',
  'Cleaning',
  'Pet care',
  'Pet care',
  'Cleaning',
  'Bathroom',
  'Kitchen',
  'Kitchen',
  'Kitchen',
  'Garden',
  'Seasonal',
  'Personal warmth',
  'Tools',
  'Home & storage',
  'Home & storage',
  'Pet care',
  'Kitchen',
  'Pet care',
  'Workwear',
];

function historicalMoney(value: string): number | null {
  return value === '' ? null : parseGbpToPence(value);
}

/** Title screening raises a caution; it does not assert certification or product specifications. */
function screenHistoricalRisk(row: HistoricalLeadRow): Pick<Product, 'risk' | 'notes'> {
  if (row.product_name === 'Rechargeable hand warmer') {
    return {
      risk: 'high',
      notes: [
        'Heuristic safety block: the title suggests a rechargeable battery product. Battery specification and safety documentation are not verified; manual review is required.',
      ],
    };
  }
  if (row.product_name === 'Portwest flame-resistant work shirt') {
    return {
      risk: 'high',
      notes: [
        'Heuristic safety block: the title suggests branded protective workwear/PPE. Protective claims, conformity documentation and brand authorisation are not verified.',
      ],
    };
  }
  return {
    risk: row.risk_level === 'low' ? 'low' : 'unknown',
    notes: [
      row.risk_level === 'low'
        ? 'The historical CSV labels risk as low; this is unverified and is not safety clearance.'
        : 'No risk assessment was supplied. Product safety remains unknown.',
    ],
  };
}

export const demoProducts: Product[] = z
  .array(productSchema)
  .length(20)
  .parse(
    demoLeadRows.map((row, index) => {
      const screening = screenHistoricalRisk(row);
      const sourceRowNumber = index + 2;
      return {
        id: `lead-${String(index + 1).padStart(3, '0')}`,
        title: row.product_name,
        category: displayCategories[index] ?? 'Uncategorised',
        supplier: row.supplier,
        supplierSku: row.supplier_sku || null,
        variant: null,
        packQuantity: null,
        risk: screening.risk,
        historicalUnitCostPence: historicalMoney(row.supplier_cost),
        historicalShippingPence: historicalMoney(row.shipping_cost),
        historicalHandlingPence: historicalMoney(row.handling_cost),
        suggestedScenarioPricePence: historicalMoney(row.target_sell_price),
        source: createProvenance({
          sourceType: 'historical_lead',
          sourceUrlOrDocument: 'twenty_unverified_leads.csv',
          sourceRecordId: `twenty_unverified_leads.csv:${sourceRowNumber}`,
          recordedAt: null,
          validAsOf: null,
          capturedBy: 'Historical seed file; original researcher not recorded',
          licenceBasis: null,
          permittedUses: ['catalogue'],
          permission: 'pending',
          isDemo: true,
          expiresAt: null,
        }),
        evidence: emptyEvidence(),
        notes: [
          'DEMO / UNVERIFIED_LEAD: historical advertised supplier figures are not live prices or verified landed costs.',
          'Supplier SKU, exact variant, stock, delivery, returns, permission and marketplace demand are not verified. Missing values remain unknown.',
          'Display category is inferred from the title for navigation; no supplier category or exact pack specification is verified.',
          ...screening.notes,
          ...(row.target_sell_price
            ? [
                'The historical target selling price is a manual what-if scenario, not an observed marketplace price or a recommendation.',
              ]
            : [
                'No target selling price was supplied; no product scenario price has been invented.',
              ]),
          ...(row.handling_cost
            ? [
                'The historical handling amount is unverified; supplier tax treatment and delivery cost are missing.',
              ]
            : ['Handling cost was not supplied; it is unknown rather than free.']),
        ],
      };
    }),
  );

export const demoSeedMetadata = Object.freeze({
  mode: 'DEMO' as const,
  status: 'UNVERIFIED_LEAD' as const,
  sourceDocument: 'twenty_unverified_leads.csv',
  sourceDescription: 'Historical audit supplied by the project owner; not a live supplier feed.',
  sourceRecordedAt: null,
  leadCount: 20,
  originalInvestigationLeadIds: ['lead-001', 'lead-002', 'lead-003'] as const,
  approvedLeadCount: 0,
  warning:
    'None of the original investigation leads was approved to list. Historical costs, shipping uncertainty and competition require fresh, permitted evidence.',
});
