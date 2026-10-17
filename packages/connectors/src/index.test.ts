import { describe, expect, it } from 'vitest';
import {
  EBAY_API_ENABLED,
  EBAY_MARKET_ANALYTICS_LICENSED,
  EBAY_PRICING_ANALYTICS_LICENSED,
  evaluateProviderPermission,
  registeredProviders,
  type ProviderPolicy,
  type RestrictedProviderFlags,
} from './index';

const now = '2026-10-16T12:00:00Z';
// Deliberately synthetic test contract; never registered as a real provider.
const policy: ProviderPolicy = {
  id: 'synthetic-contract-test',
  sourceType: 'ebay_browse',
  containsEbayContent: true,
  apiName: 'synthetic-api-for-contract-test',
  scopes: ['synthetic-scope'],
  fields: ['synthetic-field'],
  marketplace: 'EBAY_GB',
  capabilities: ['active_offers'],
  permission: 'approved',
  allowedUses: ['catalogue_display', 'price_modelling', 'competition_analytics'],
  licenceDocument: 'synthetic-test-document',
  licenceVerifiedAt: '2026-10-01T00:00:00Z',
  licenceExpiresAt: '2026-11-01T00:00:00Z',
  retentionDays: 7,
};
const enabledForContractTest: RestrictedProviderFlags = {
  EBAY_API_ENABLED: true,
  EBAY_MARKET_ANALYTICS_LICENSED: true,
  EBAY_PRICING_ANALYTICS_LICENSED: true,
};

function codes(input: unknown = policy, intendedUse = 'catalogue_display' as const) {
  return evaluateProviderPermission(input, { capability: 'active_offers', intendedUse, now }).reasons.map(
    (reason) => reason.code,
  );
}

describe('restricted provider contracts', () => {
  it('ships all eBay flags off and registers no integration', () => {
    expect([EBAY_API_ENABLED, EBAY_MARKET_ANALYTICS_LICENSED, EBAY_PRICING_ANALYTICS_LICENSED]).toEqual([
      false,
      false,
      false,
    ]);
    expect(registeredProviders).toEqual([]);
    expect(codes()).toContain('EBAY_API_DISABLED');
  });

  it('separately blocks marketplace analytics and price modelling by default', () => {
    expect(
      evaluateProviderPermission(policy, { capability: 'active_offers', intendedUse: 'price_modelling', now })
        .reasons.map((reason) => reason.code),
    ).toContain('EBAY_PRICING_ANALYTICS_DISABLED');
    expect(
      evaluateProviderPermission(policy, {
        capability: 'active_offers',
        intendedUse: 'competition_analytics',
        now,
      }).reasons.map((reason) => reason.code),
    ).toContain('EBAY_MARKET_ANALYTICS_DISABLED');
  });

  it('never treats Browse as sold history even with all hypothetical flags enabled', () => {
    const decision = evaluateProviderPermission(
      { ...policy, capabilities: ['active_offers', 'sales_history'], allowedUses: ['demand_analytics'] },
      { capability: 'sales_history', intendedUse: 'demand_analytics', now },
      enabledForContractTest,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.map((reason) => reason.code)).toContain('BROWSE_IS_NOT_SOLD_HISTORY');
  });

  it('requires explicit approval, reviewed licence and retention even with hypothetical flags enabled', () => {
    const decision = evaluateProviderPermission(
      { ...policy, permission: 'pending', licenceDocument: null, licenceVerifiedAt: null, retentionDays: null },
      { capability: 'active_offers', intendedUse: 'catalogue_display', now },
      enabledForContractTest,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['PERMISSION_NOT_APPROVED', 'LICENCE_NOT_VERIFIED', 'RETENTION_NOT_DEFINED']),
    );
  });

  it('blocks licence expiry at the exact expiry instant', () => {
    expect(
      codes({ ...policy, licenceExpiresAt: now }),
    ).toContain('LICENCE_EXPIRED');
  });

  it('rejects future licence review, malformed contracts and invalid check times', () => {
    expect(codes({ ...policy, licenceVerifiedAt: '2026-10-17T00:00:00Z' })).toContain(
      'LICENCE_NOT_YET_VERIFIED',
    );
    expect(codes({ id: 'missing-contract' })).toEqual(['INVALID_POLICY']);
    expect(
      evaluateProviderPermission(policy, {
        capability: 'active_offers',
        intendedUse: 'catalogue_display',
        now: 'not-a-date',
      }).reasons.map((reason) => reason.code),
    ).toContain('INVALID_CHECK_TIME');
  });

  it('rejects a missing capability or downstream use', () => {
    const decision = evaluateProviderPermission(
      policy,
      { capability: 'stock', intendedUse: 'demand_analytics', now },
      enabledForContractTest,
    );
    expect(decision.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['CAPABILITY_NOT_ALLOWED', 'USE_NOT_ALLOWED']),
    );
  });

  it('cannot bypass eBay restrictions by mislabelling Browse provenance', () => {
    expect(codes({ ...policy, containsEbayContent: false })).toEqual(
      expect.arrayContaining(['EBAY_CONTENT_MISCLASSIFIED', 'EBAY_API_DISABLED']),
    );
  });

  it('allows only an explicit complete non-eBay contract without enabling any eBay flag', () => {
    const decision = evaluateProviderPermission(
      { ...policy, sourceType: 'licensed_provider', containsEbayContent: false },
      { capability: 'active_offers', intendedUse: 'catalogue_display', now },
    );
    expect(decision).toEqual({ allowed: true, reasons: [] });
  });
});
