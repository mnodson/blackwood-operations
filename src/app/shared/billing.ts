/**
 * Stripe customer portal login link, where monitoring customers update their
 * card or cancel. Customers enter their email and Stripe sends a sign-in link,
 * so no account system is needed on our side.
 *
 * Stripe dashboard → Settings → Billing → Customer portal → "Login link".
 * Links to the portal are hidden while this is empty.
 */
export const BILLING_PORTAL_URL = 'https://billing.stripe.com/p/login/dRm9AMghp3Pk2yb4SG9R600';
