import { describe, expect, it } from 'vitest';
import { demoLeadRows, demoProducts, demoSeedMetadata, historicalLeadRowSchema } from './index';

describe('historical demo leads', () => {
  it('preserves all 20 exact lead names, suppliers and historical unit costs', () => {
    expect(
      demoProducts.map((product) => [
        product.title,
        product.supplier,
        product.historicalUnitCostPence,
      ]),
    ).toEqual([
      ['58-piece ratchet screwdriver set', 'Wholesale Finds UK', 749],
      ['Set of three white wicker storage baskets', 'Avasam', 1299],
      ['3-in-1 spray window squeegee', 'Wholesale Finds UK', 290],
      ['Self-cleaning pet grooming brush', 'Wholesale Finds UK', 299],
      ['Reusable pet hair removal roller', 'Wholesale Finds UK', 399],
      ['Venetian blind cleaning brush', 'Wholesale Finds UK', 400],
      ['Silicone shower foot scrubber', 'Wholesale Finds UK', 380],
      ['Three-piece stainless steel sieve set', 'Wholesale Finds UK', 365],
      ['Two-in-one glass oil sprayer', 'Wholesale Finds UK', 349],
      ['Twelve-in-one vegetable chopper', 'Wholesale Finds UK', 465],
      ['Garden hose spray gun', 'Wholesale Finds UK', 285],
      ['Christmas door bow kit', 'Wholesale Finds UK', 449],
      ['Rechargeable hand warmer', 'Wholesale Finds UK', 385],
      ['Precision screwdriver six-piece set', 'Wholesale Finds UK', 275],
      ['Five-pack door stops', 'Wholesale Finds UK', 199],
      ['Five-tier metal storage rack', 'Avasam', 1440],
      ['Quilted pet sofa cover', 'Avasam', 936],
      ['Two-tier wooden dish rack', 'Avasam', 446],
      ['Three-pack pet blanket', 'Avasam', 262],
      ['Portwest flame-resistant work shirt', 'Avasam', 1949],
    ]);
  });

  it('preserves missing freight, handling and prices without treating unknowns as zero', () => {
    expect(demoProducts.every((product) => product.historicalShippingPence === null)).toBe(true);
    expect(demoProducts.map((product) => product.historicalHandlingPence)).toEqual([
      35,
      null,
      35,
      ...Array<null>(17).fill(null),
    ]);
    expect(demoProducts.map((product) => product.suggestedScenarioPricePence)).toEqual([
      1999,
      2999,
      1099,
      ...Array<null>(17).fill(null),
    ]);
    expect(demoLeadRows[2]?.supplier_cost).toBe('2.9');
  });

  it('keeps local lead IDs separate from missing supplier SKUs and exact pack evidence', () => {
    expect(new Set(demoProducts.map((product) => product.id)).size).toBe(20);
    expect(
      demoProducts.every(
        (product) =>
          product.supplierSku === null && product.variant === null && product.packQuantity === null,
      ),
    ).toBe(true);
    expect(demoProducts[0]?.source.sourceRecordId).toBe('twenty_unverified_leads.csv:2');
    expect(demoProducts[19]?.source.sourceRecordId).toBe('twenty_unverified_leads.csv:21');
  });

  it('does not invent dates, permission, evidence, supplier metrics or ratings', () => {
    for (const product of demoProducts) {
      expect(product.source).toMatchObject({
        isDemo: true,
        sourceType: 'historical_lead',
        recordedAt: null,
        validAsOf: null,
        licenceBasis: null,
        permission: 'pending',
        permittedUses: ['catalogue'],
      });
      expect(Object.values(product.evidence).every((record) => record === null)).toBe(true);
      expect(product).not.toHaveProperty('rating');
      expect(product).not.toHaveProperty('stockQuantity');
    }
    expect(demoSeedMetadata.approvedLeadCount).toBe(0);
  });

  it('distinguishes historical low risk from explicit heuristic safety blocks', () => {
    expect(demoProducts[2]?.risk).toBe('low');
    expect(demoProducts.filter((product) => product.risk === 'unknown')).toHaveLength(17);
    expect(
      demoProducts.filter((product) => product.risk === 'high').map((product) => product.title),
    ).toEqual(['Rechargeable hand warmer', 'Portwest flame-resistant work shirt']);
    expect(demoProducts[12]?.notes.join(' ')).toContain('Heuristic safety block');
    expect(demoProducts[19]?.notes.join(' ')).toContain('PPE');
  });

  it('rejects malformed external rows instead of silently accepting extra fields or claimed permission', () => {
    const row = demoLeadRows[0];
    expect(
      historicalLeadRowSchema.safeParse({ ...row, supplier_permission_confirmed: 'yes' }).success,
    ).toBe(false);
    expect(historicalLeadRowSchema.safeParse({ ...row, unexplained_field: 'value' }).success).toBe(
      false,
    );
    expect(historicalLeadRowSchema.safeParse({ ...row, supplier_cost: '-1.00' }).success).toBe(
      false,
    );
  });
});
