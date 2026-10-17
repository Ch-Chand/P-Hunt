import { z } from 'zod';

/** Restricted marketplace access is deliberately unavailable in the P0/P1 build. */
export const EBAY_API_ENABLED = false;
export const EBAY_MARKET_ANALYTICS_LICENSED = false;
export const EBAY_PRICING_ANALYTICS_LICENSED = false;

export interface RestrictedProviderFlags {
  EBAY_API_ENABLED: boolean;
  EBAY_MARKET_ANALYTICS_LICENSED: boolean;
  EBAY_PRICING_ANALYTICS_LICENSED: boolean;
}

export const restrictedProviderFlags: Readonly<RestrictedProviderFlags> = Object.freeze({
  EBAY_API_ENABLED,
  EBAY_MARKET_ANALYTICS_LICENSED,
  EBAY_PRICING_ANALYTICS_LICENSED,
});

const capabilities = ['catalogue', 'stock', 'shipping', 'active_offers', 'sales_history'] as const;
const permittedUses = [
  'catalogue_display',
  'private_research_storage',
  'demand_analytics',
  'competition_analytics',
  'price_modelling',
] as const;

/** A future provider must document rights, retention and its precise technical surface. */
export const providerPolicySchema = z
  .object({
    id: z.string().trim().min(1),
    sourceType: z.enum(['ebay_browse', 'licensed_provider', 'manual_research']),
    containsEbayContent: z.boolean(),
    apiName: z.string().trim().min(1).nullable(),
    scopes: z.array(z.string().trim().min(1)),
    fields: z.array(z.string().trim().min(1)),
    marketplace: z.literal('EBAY_GB'),
    capabilities: z.array(z.enum(capabilities)),
    permission: z.enum(['approved', 'manual_only', 'pending', 'blocked']),
    allowedUses: z.array(z.enum(permittedUses)),
    licenceDocument: z.string().trim().min(1).nullable(),
    licenceVerifiedAt: z.string().datetime({ offset: true }).nullable(),
    licenceExpiresAt: z.string().datetime({ offset: true }).nullable(),
    retentionDays: z.number().int().positive().max(3650).nullable(),
  })
  .strict();

export type ProviderPolicy = z.infer<typeof providerPolicySchema>;
export type ProviderCapability = (typeof capabilities)[number];
export type ProviderUse = (typeof permittedUses)[number];

export interface ProviderAccessRequest {
  capability: ProviderCapability;
  intendedUse: ProviderUse;
  /** Caller supplies time explicitly to keep permission decisions reproducible. */
  now: string;
}

export type ProviderBlockCode =
  | 'INVALID_POLICY'
  | 'INVALID_CHECK_TIME'
  | 'PERMISSION_NOT_APPROVED'
  | 'LICENCE_NOT_VERIFIED'
  | 'LICENCE_NOT_YET_VERIFIED'
  | 'LICENCE_EXPIRED'
  | 'RETENTION_NOT_DEFINED'
  | 'CAPABILITY_NOT_ALLOWED'
  | 'USE_NOT_ALLOWED'
  | 'BROWSE_IS_NOT_SOLD_HISTORY'
  | 'EBAY_CONTENT_MISCLASSIFIED'
  | 'TECHNICAL_SCOPE_MISSING'
  | 'EBAY_API_DISABLED'
  | 'EBAY_MARKET_ANALYTICS_DISABLED'
  | 'EBAY_PRICING_ANALYTICS_DISABLED';

export interface ProviderPermissionDecision {
  allowed: boolean;
  reasons: { code: ProviderBlockCode; message: string }[];
}

/**
 * Pure permission contract only: no fetch, scraping or provider is implemented.
 * Technical access alone cannot approve a use; every restriction fails closed.
 */
export function evaluateProviderPermission(
  input: unknown,
  request: ProviderAccessRequest,
  flags: Readonly<RestrictedProviderFlags> = restrictedProviderFlags,
): ProviderPermissionDecision {
  const parsed = providerPolicySchema.safeParse(input);
  if (!parsed.success) {
    return {
      allowed: false,
      reasons: [{ code: 'INVALID_POLICY', message: 'Provider rights and capability contract is incomplete.' }],
    };
  }

  const reasons: ProviderPermissionDecision['reasons'] = [];
  const block = (code: ProviderBlockCode, message: string) => reasons.push({ code, message });
  const policy = parsed.data;
  const parsedNow = z.string().datetime({ offset: true }).safeParse(request.now);
  const nowMilliseconds = parsedNow.success ? Date.parse(parsedNow.data) : Number.NaN;

  if (!Number.isFinite(nowMilliseconds)) {
    block('INVALID_CHECK_TIME', 'Permission cannot be checked without a valid UTC or offset timestamp.');
  }
  if (policy.permission !== 'approved') {
    block('PERMISSION_NOT_APPROVED', 'Documented approval for this provider is required.');
  }
  if (policy.licenceDocument === null || policy.licenceVerifiedAt === null) {
    block('LICENCE_NOT_VERIFIED', 'The licence document and its review timestamp are missing.');
  } else if (Date.parse(policy.licenceVerifiedAt) > nowMilliseconds) {
    block('LICENCE_NOT_YET_VERIFIED', 'The licence review timestamp is in the future.');
  }
  if (policy.licenceExpiresAt !== null && Date.parse(policy.licenceExpiresAt) <= nowMilliseconds) {
    block('LICENCE_EXPIRED', 'The documented permission has expired.');
  }
  if (policy.retentionDays === null) {
    block('RETENTION_NOT_DEFINED', 'A permitted retention and deletion period is required.');
  }
  if (!policy.capabilities.includes(request.capability)) {
    block('CAPABILITY_NOT_ALLOWED', 'The provider contract does not permit the requested capability.');
  }
  if (!policy.allowedUses.includes(request.intendedUse)) {
    block('USE_NOT_ALLOWED', 'The provider contract does not permit this downstream use.');
  }
  if (policy.sourceType === 'ebay_browse') {
    if (request.capability === 'sales_history' || policy.capabilities.includes('sales_history')) {
      block('BROWSE_IS_NOT_SOLD_HISTORY', 'eBay Browse provides active listings, not sold transaction history.');
    }
    if (!policy.containsEbayContent) {
      block('EBAY_CONTENT_MISCLASSIFIED', 'Browse content must retain its eBay provenance and restrictions.');
    }
  }
  if (
    policy.sourceType !== 'manual_research' &&
    (policy.apiName === null ||
      policy.fields.length === 0 ||
      (policy.sourceType === 'ebay_browse' && policy.scopes.length === 0))
  ) {
    block('TECHNICAL_SCOPE_MISSING', 'The authorised API, precise fields and required scopes must be documented.');
  }

  if (policy.containsEbayContent || policy.sourceType === 'ebay_browse') {
    if (!flags.EBAY_API_ENABLED) {
      block('EBAY_API_DISABLED', 'eBay data access is disabled in this build.');
    }
    if (
      (request.capability === 'sales_history' ||
        request.intendedUse === 'demand_analytics' ||
        request.intendedUse === 'competition_analytics') &&
      !flags.EBAY_MARKET_ANALYTICS_LICENSED
    ) {
      block('EBAY_MARKET_ANALYTICS_DISABLED', 'eBay marketplace-history and derivative analytics are disabled.');
    }
    if (request.intendedUse === 'price_modelling' && !flags.EBAY_PRICING_ANALYTICS_LICENSED) {
      block('EBAY_PRICING_ANALYTICS_DISABLED', 'Price modelling from eBay content is disabled.');
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

/** No network-capable providers are registered in P0/P1. */
export const registeredProviders: readonly ProviderPolicy[] = Object.freeze([]);
