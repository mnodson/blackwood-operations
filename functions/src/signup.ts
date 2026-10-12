/**
 * The signup payload the Angular form sends to `createCheckoutSession`.
 * Mirrored on the client in `src/app/shared/checkout.ts` — keep both in step.
 */

import { US_STATES } from './states.js';

export const PLAN_IDS = ['essential', 'practice', 'group'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface SignupRequest {
  plan: PlanId;
  /** Adds the monthly monitoring subscription on top of the one-time update. */
  monitoring: boolean;
  practice: {
    name: string;
    type: string;
    typeOther?: string;
    locationCount: number;
    /** Two-letter codes from `US_STATES`, deduplicated. */
    states: string[];
    hasNotice: 'Yes' | 'No' | 'Not sure';
  };
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  /** Storage object path of the optional notice upload, e.g. notice-uploads/<id>/notice.pdf */
  noticeUploadPath?: string;
  /** Customer-facing promotion code from a ?promo= link, applied before Checkout opens. */
  promoCode?: string;
}

const HAS_NOTICE = ['Yes', 'No', 'Not sure'] as const;
const UPLOAD_PATH = /^notice-uploads\/[A-Za-z0-9-]{8,64}\/[^/]{1,200}$/;
const PROMO_CODE = /^[A-Za-z0-9_-]{1,50}$/;

class ValidationError extends Error {}

function str(value: unknown, field: string, max = 200, min = 1): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max} characters`);
  }
  return trimmed;
}

function count(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10_000) {
    throw new ValidationError(`${field} must be a whole number of at least 1`);
  }
  return value;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (typeof value !== 'string' || !options.includes(value as T)) {
    throw new ValidationError(`${field} must be one of ${options.join(', ')}`);
  }
  return value as T;
}

function stateCodes(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`${field} must list at least one state`);
  }
  const codes = [...new Set(value)];
  for (const code of codes) {
    if (typeof code !== 'string' || !Object.hasOwn(US_STATES, code)) {
      throw new ValidationError(`${field} contains an unknown state`);
    }
  }
  return codes as string[];
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${field} is required`);
  }
  return value as Record<string, unknown>;
}

/**
 * Returns a cleaned copy of the payload or throws a `ValidationError` naming
 * the first problem. Unknown fields are dropped so only known data reaches
 * Firestore and Stripe metadata.
 */
export function parseSignupRequest(data: unknown): SignupRequest {
  const body = record(data, 'request');
  const practice = record(body['practice'], 'practice');
  const contact = record(body['contact'], 'contact');

  const email = str(contact['email'], 'contact.email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('contact.email must be a valid email address');
  }

  const parsed: SignupRequest = {
    plan: oneOf(body['plan'], PLAN_IDS, 'plan'),
    monitoring: body['monitoring'] === true,
    practice: {
      name: str(practice['name'], 'practice.name', 200, 2),
      type: str(practice['type'], 'practice.type', 100),
      locationCount: count(practice['locationCount'], 'practice.locationCount'),
      states: stateCodes(practice['states'], 'practice.states'),
      hasNotice: oneOf(practice['hasNotice'], HAS_NOTICE, 'practice.hasNotice')
    },
    contact: {
      name: str(contact['name'], 'contact.name', 200, 2),
      email,
      phone: str(contact['phone'], 'contact.phone', 50)
    }
  };

  if (typeof practice['typeOther'] === 'string' && practice['typeOther'].trim()) {
    parsed.practice.typeOther = str(practice['typeOther'], 'practice.typeOther', 200);
  }

  if (body['noticeUploadPath'] !== undefined && body['noticeUploadPath'] !== null) {
    const path = str(body['noticeUploadPath'], 'noticeUploadPath', 300);
    if (!UPLOAD_PATH.test(path)) {
      throw new ValidationError('noticeUploadPath is not a valid upload location');
    }
    parsed.noticeUploadPath = path;
  }

  if (typeof body['promoCode'] === 'string' && body['promoCode'].trim()) {
    const code = str(body['promoCode'], 'promoCode', 50);
    if (!PROMO_CODE.test(code)) {
      throw new ValidationError('promoCode is not a valid promotion code');
    }
    parsed.promoCode = code;
  }

  return parsed;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
