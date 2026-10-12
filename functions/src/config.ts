import { defineSecret, defineString } from 'firebase-functions/params';
import { Resend } from 'resend';
import Stripe from 'stripe';
import type { PlanId } from './signup.js';

/** Set with `firebase functions:secrets:set STRIPE_SECRET_KEY` (emulator: functions/.secret.local). */
export const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
export const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/** Plain params live in functions/.env — see functions/.env.example. */
export const appOrigin = defineString('APP_ORIGIN', {
  default: 'https://blackwoodops.com'
});

/**
 * Stripe customer portal login link, included in monitoring customers'
 * confirmation email so they can update their card or cancel. Mirrors
 * `src/app/shared/billing.ts`. Left empty, the email omits it.
 */
export const billingPortalUrl = defineString('BILLING_PORTAL_URL', { default: '' });

/**
 * Sites allowed to call the callable functions from a browser: the live
 * domains, Firebase preview channels, and `ng serve`.
 */
export const allowedOrigins: (string | RegExp)[] = [
  'https://blackwoodops.com',
  'https://www.blackwoodops.com',
  'https://blackwood-operations.web.app',
  'https://blackwood-operations.firebaseapp.com',
  /^https:\/\/blackwood-operations--[a-z0-9-]+\.web\.app$/,
  /^http:\/\/localhost:\d+$/
];

/**
 * Rejects callable requests without a valid App Check token. Turn on only
 * after the site sends tokens (APP_CHECK_SITE_KEY in src/app/shared/firebase.ts)
 * and the App Check console shows nearly all requests as verified — otherwise
 * every real visitor is refused.
 */
export const enforceAppCheck = false;

/** Resend API key (re_…). Set with `firebase functions:secrets:set RESEND_API_KEY`. */
export const resendApiKey = defineSecret('RESEND_API_KEY');

/**
 * Sender for every order email. The domain must be verified in Resend
 * (Resend → Domains) or sends are rejected.
 */
export const orderFromEmail = defineString('ORDER_FROM_EMAIL', {
  default: 'Blackwood Operations <admin@blackwoodops.com>'
});

/** Where the internal new-order email goes. */
export const orderNotifyEmail = defineString('ORDER_NOTIFY_EMAIL', {
  default: 'admin@blackwoodops.com'
});

/** Reply-to on the customer confirmation, so replies reach the team. */
export const orderReplyToEmail = defineString('ORDER_REPLY_TO_EMAIL', {
  default: 'admin@blackwoodops.com'
});

// Empty defaults let the functions deploy before the Stripe products exist;
// `createCheckoutSession` refuses cleanly until every price is filled in.

/** One-time prices for the document update. */
const updatePriceParams = {
  essential: defineString('STRIPE_PRICE_ESSENTIAL', { default: '' }),
  practice: defineString('STRIPE_PRICE_PRACTICE', { default: '' }),
  group: defineString('STRIPE_PRICE_GROUP', { default: '' })
} as const satisfies Record<PlanId, unknown>;

/** Recurring monthly prices for the optional monitoring add-on. */
const monitoringPriceParams = {
  essential: defineString('STRIPE_PRICE_ESSENTIAL_MONITORING', { default: '' }),
  practice: defineString('STRIPE_PRICE_PRACTICE_MONITORING', { default: '' }),
  group: defineString('STRIPE_PRICE_GROUP_MONITORING', { default: '' })
} as const satisfies Record<PlanId, unknown>;

export function updatePriceIdFor(plan: PlanId): string {
  return updatePriceParams[plan].value();
}

export function monitoringPriceIdFor(plan: PlanId): string {
  return monitoringPriceParams[plan].value();
}

/**
 * True once a real API key and every plan price are configured. Accepts a
 * standard secret key (sk_) or a restricted key (rk_) with Checkout Sessions
 * write and Promotion codes and Coupons read access.
 */
export function isStripeConfigured(): boolean {
  return (
    /^(sk|rk)_/.test(stripeSecretKey.value()) &&
    [...Object.values(updatePriceParams), ...Object.values(monitoringPriceParams)].every(param =>
      param.value().startsWith('price_')
    )
  );
}

let client: Stripe | undefined;

/** Lazily built so the secret is only read inside a function invocation. */
export function stripe(): Stripe {
  client ??= new Stripe(stripeSecretKey.value(), {
    typescript: true,
    appInfo: { name: 'blackwood-operations', url: appOrigin.value() }
  });
  return client;
}

let resendClient: Resend | undefined;

/** Lazily built so the secret is only read inside a function invocation. */
export function resend(): Resend {
  resendClient ??= new Resend(resendApiKey.value());
  return resendClient;
}
