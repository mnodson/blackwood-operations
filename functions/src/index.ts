import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import type Stripe from 'stripe';
import {
  appOrigin,
  isStripeConfigured,
  monitoringPriceIdFor,
  orderFromEmail,
  orderNotifyEmail,
  orderReplyToEmail,
  resend,
  resendApiKey,
  stripe,
  stripeSecretKey,
  stripeWebhookSecret,
  updatePriceIdFor
} from './config.js';
import {
  customerConfirmationEmail,
  teamOrderEmail,
  type OrderDetails,
  type OrderEmail,
  type OrderOutcome
} from './notify.js';
import { isValidationError, parseSignupRequest, type SignupRequest } from './signup.js';

initializeApp();

const db = getFirestore();
const signups = db.collection('signups');

/**
 * Lifecycle of the one-time document update. `checkout_pending` is the form
 * having been submitted. Every later state is set by the Stripe webhook, never
 * the client: `awaiting_payment` when checkout finished with a payment method
 * that settles later (e.g. a bank debit), then `paid` or `payment_failed`.
 * Card declines never get this far — Stripe handles them on its own page.
 */
type SignupStatus = 'checkout_pending' | 'awaiting_payment' | 'paid' | 'payment_failed';

/**
 * Lifecycle of the optional monitoring add-on, kept separate so cancelling
 * monitoring never makes a paid update look unpaid. `none` means it was not
 * purchased; every other state is set by the Stripe webhook.
 */
type MonitoringStatus = 'none' | 'pending' | 'active' | 'past_due' | 'canceled';

/**
 * Step 1 of checkout. Called by the signup form once every step validates.
 * Records the answers in Firestore, opens a Stripe Checkout Session for the
 * chosen plan, and returns the hosted page URL.
 *
 * The update alone is a one-time payment. With monitoring the session runs in
 * subscription mode: the one-time update is charged on the first invoice
 * alongside the first month of monitoring.
 *
 * No card details pass through here — Stripe collects them on its own page.
 */
export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey], cors: true, enforceAppCheck: false },
  async request => {
    if (!isStripeConfigured()) {
      logger.warn('createCheckoutSession called before Stripe was configured');
      throw new HttpsError('failed-precondition', 'Checkout is not available yet.');
    }

    let signup;
    try {
      signup = parseSignupRequest(request.data);
    } catch (error) {
      if (isValidationError(error)) {
        throw new HttpsError('invalid-argument', error.message);
      }
      throw error;
    }

    const promotionCodeId = signup.promoCode
      ? await findPromotionCodeId(signup.promoCode)
      : undefined;

    const ref = signups.doc();
    const origin = appOrigin.value();

    await ref.set({
      ...signup,
      status: 'checkout_pending' satisfies SignupStatus,
      monitoringStatus: (signup.monitoring ? 'pending' : 'none') satisfies MonitoringStatus,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe().checkout.sessions.create(
        checkoutParams(ref.id, signup, origin, promotionCodeId),
        // Retrying the same signup never opens two sessions.
        { idempotencyKey: `checkout-${ref.id}` }
      );
    } catch (error) {
      logger.error('Stripe checkout session failed', { signupId: ref.id, error });
      // Stripe checks the code's restrictions (first-time order, minimum
      // amount, eligible products) only when the session is created.
      if (promotionCodeId && (error as { type?: string }).type === 'StripeInvalidRequestError') {
        throw new HttpsError('not-found', 'That promotion code cannot be used for this order.');
      }
      throw new HttpsError('unavailable', 'Checkout is temporarily unavailable. Please try again.');
    }

    if (!session.url) {
      throw new HttpsError('internal', 'Stripe did not return a checkout URL');
    }

    await ref.update({
      'stripe.checkoutSessionId': session.id,
      updatedAt: FieldValue.serverTimestamp()
    });

    logger.info('Checkout session created', {
      signupId: ref.id,
      plan: signup.plan,
      monitoring: signup.monitoring
    });

    return { url: session.url, signupId: ref.id };
  }
);

/**
 * Resolves a customer-facing code from a ?promo= link to its promotion code
 * id. Applying it here instead of in Checkout's own promo field avoids that
 * field's bot check, which can fail with a 403 and no visible challenge.
 */
async function findPromotionCodeId(code: string): Promise<string> {
  const { data } = await stripe().promotionCodes.list({ code, active: true, limit: 1 });
  const promotionCode = data[0];

  if (!promotionCode) {
    throw new HttpsError('not-found', 'That promotion code is not valid or has expired.');
  }

  return promotionCode.id;
}

function checkoutParams(
  signupId: string,
  signup: SignupRequest,
  origin: string,
  promotionCodeId?: string
): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    signupId,
    plan: signup.plan,
    monitoring: String(signup.monitoring),
    practiceName: signup.practice.name
  };
  const monitoringQuery = signup.monitoring ? '&monitoring=1' : '';
  const promoQuery = signup.promoCode ? `&promo=${encodeURIComponent(signup.promoCode)}` : '';

  const shared = {
    customer_email: signup.contact.email,
    client_reference_id: signupId,
    metadata,
    // Stripe accepts one or the other: a code already applied, or the field.
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
    billing_address_collection: 'required',
    success_url: `${origin}/compliance/signup/success?session_id={CHECKOUT_SESSION_ID}${monitoringQuery}`,
    cancel_url: `${origin}/compliance/signup?plan=${signup.plan}${monitoringQuery}${promoQuery}&canceled=1`
  } satisfies Stripe.Checkout.SessionCreateParams;

  const update = { price: updatePriceIdFor(signup.plan), quantity: 1 };

  if (signup.monitoring) {
    return {
      ...shared,
      mode: 'subscription',
      line_items: [update, { price: monitoringPriceIdFor(signup.plan), quantity: 1 }],
      subscription_data: { metadata }
    };
  }

  return {
    ...shared,
    mode: 'payment',
    line_items: [update],
    customer_creation: 'always',
    invoice_creation: { enabled: true },
    payment_intent_data: { metadata }
  };
}

/**
 * Called by the success page with the `session_id` Stripe appends to the
 * return URL. Confirms with Stripe whether the session was paid (or, for a
 * delayed payment method, is still processing or has failed) and returns just
 * enough to show the outcome. Session ids are unguessable, and only
 * sessions created by `createCheckoutSession` (carrying a signupId) answer.
 */
export const getCheckoutSummary = onCall(
  { secrets: [stripeSecretKey], cors: true, enforceAppCheck: false },
  async request => {
    const sessionId = (request.data as { sessionId?: unknown } | null)?.sessionId;
    if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
      throw new HttpsError('invalid-argument', 'A valid checkout session id is required.');
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe().checkout.sessions.retrieve(sessionId);
    } catch (error) {
      logger.warn('Checkout summary lookup failed', { sessionId, error });
      throw new HttpsError('not-found', 'Checkout session not found.');
    }

    const signupId = session.metadata?.['signupId'];
    if (!signupId) {
      throw new HttpsError('not-found', 'Checkout session not found.');
    }

    // A delayed payment's failure is recorded by the webhook, not on the session.
    const signup = await signups.doc(signupId).get();
    const failed = signup.get('status') === ('payment_failed' satisfies SignupStatus);
    const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';

    return {
      outcome: failed ? 'failed' : paid ? 'paid' : 'processing',
      plan: session.metadata?.['plan'] ?? null,
      monitoring: session.mode === 'subscription',
      amountTotal: session.amount_total,
      currency: session.currency,
      email: session.customer_details?.email ?? null,
      practiceName: session.metadata?.['practiceName'] ?? null
    };
  }
);

/**
 * Step 2 of checkout. Stripe calls this when checkout completes and as any
 * monitoring subscription moves through its life; the handlers keep
 * `signups/{id}.status` and `signups/{id}.monitoringStatus` in step with it.
 *
 * Endpoint URL to register in the Stripe dashboard (or `stripe listen` locally):
 *   https://<region>-<project>.cloudfunctions.net/stripeWebhook
 */
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret, resendApiKey] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      res.status(400).send('Missing Stripe signature');
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
    } catch (error) {
      logger.warn('Webhook signature verification failed', { error });
      res.status(400).send('Invalid signature');
      return;
    }

    // Stripe retries on any non-2xx and may deliver an event more than once.
    const receipt = db.collection('stripeEvents').doc(event.id);
    const alreadyHandled = await db.runTransaction(async tx => {
      if ((await tx.get(receipt)).exists) {
        return true;
      }
      tx.set(receipt, { type: event.type, receivedAt: FieldValue.serverTimestamp() });
      return false;
    });

    if (alreadyHandled) {
      res.status(200).send('Already processed');
      return;
    }

    try {
      await handleEvent(event);
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Webhook handler failed', { eventId: event.id, type: event.type, error });
      // Clear the receipt so Stripe's retry gets a real second attempt.
      await receipt.delete();
      res.status(500).send('Handler failed');
    }
  }
);

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // Cards settle at checkout; delayed methods report back via the async events below.
      if (session.payment_status === 'unpaid') {
        await markAwaitingPayment(session);
      } else {
        await markPaid(session);
      }
      return;
    }

    case 'checkout.session.async_payment_succeeded':
      await markPaid(event.data.object);
      return;

    case 'checkout.session.async_payment_failed':
      await markPaymentFailed(event.data.object);
      return;

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await setMonitoringStatus(subscription, monitoringStatusFrom(subscription));
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = id(invoice.parent?.subscription_details?.subscription);
      if (subscriptionId) {
        await setMonitoringStatusForSubscriptionId(subscriptionId, 'past_due');
      }
      return;
    }

    default:
      logger.debug('Unhandled Stripe event', { type: event.type });
  }
}

function signupIdOf(session: Stripe.Checkout.Session): string | null {
  const signupId = session.metadata?.['signupId'] ?? session.client_reference_id;
  if (!signupId) {
    logger.warn('Checkout session without signupId', { sessionId: session.id });
  }
  return signupId;
}

function stripeIds(session: Stripe.Checkout.Session) {
  return {
    'stripe.customerId': id(session.customer),
    'stripe.subscriptionId': id(session.subscription),
    'stripe.paymentIntentId': id(session.payment_intent)
  };
}

async function markPaid(session: Stripe.Checkout.Session): Promise<void> {
  const signupId = signupIdOf(session);
  if (!signupId) {
    return;
  }

  await signups.doc(signupId).update({
    ...stripeIds(session),
    status: 'paid' satisfies SignupStatus,
    monitoringStatus: (session.subscription ? 'active' : 'none') satisfies MonitoringStatus,
    'stripe.paidAt': FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await sendOrderEmails(signupId, session, 'paid');
}

async function markAwaitingPayment(session: Stripe.Checkout.Session): Promise<void> {
  const signupId = signupIdOf(session);
  if (!signupId) {
    return;
  }

  await signups.doc(signupId).update({
    ...stripeIds(session),
    status: 'awaiting_payment' satisfies SignupStatus,
    'stripe.checkoutCompletedAt': FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
}

async function markPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
  const signupId = signupIdOf(session);
  if (!signupId) {
    return;
  }

  await signups.doc(signupId).update({
    ...stripeIds(session),
    status: 'payment_failed' satisfies SignupStatus,
    'stripe.paymentFailedAt': FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await sendOrderEmails(signupId, session, 'failed');
}

/**
 * Sends the order emails through Resend: the internal email to the team for a
 * paid order or a failed payment, plus the customer's confirmation once paid.
 *
 * Each email is sent at most once: `signups/{id}.emailsSent` records what went
 * out, and Resend's idempotency key covers a crash between sending and
 * recording. A failed send throws so Stripe retries the webhook, and the retry
 * only sends what is still missing.
 */
async function sendOrderEmails(
  signupId: string,
  session: Stripe.Checkout.Session,
  outcome: OrderOutcome
): Promise<void> {
  const ref = signups.doc(signupId);
  const snapshot = await ref.get();
  const signup = snapshot.data() as SignupRequest | undefined;
  if (!signup) {
    logger.warn('Checkout for a missing signup', { signupId });
    return;
  }

  const order: OrderDetails = {
    signupId,
    signup,
    session,
    noticeDownloadUrl: await noticeDownloadUrl(signup)
  };

  const emails: [string, OrderEmail][] = [
    [`team-${outcome}`, teamOrderEmail(outcome, orderNotifyEmail.value(), order)]
  ];
  if (outcome === 'paid') {
    emails.push(['customer-paid', customerConfirmationEmail(orderReplyToEmail.value(), order)]);
  }

  const alreadySent = (snapshot.get('emailsSent') ?? {}) as Record<string, unknown>;
  const results = await Promise.allSettled(
    emails
      .filter(([key]) => !alreadySent[key])
      .map(async ([key, email]) => {
        const id = await sendEmail(email, `order-${key}-${signupId}`);
        await ref.update({ [`emailsSent.${key}`]: { resendId: id, sentAt: FieldValue.serverTimestamp() } });
        logger.info('Order email sent', { signupId, email: key, resendId: id });
      })
  );

  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) {
    throw new Error(`${failures.length} order email(s) failed for signup ${signupId}`, {
      cause: failures.map(failure => failure.reason)
    });
  }
}

/** Sends one email through Resend and returns its id. Resend reports errors as values, not throws. */
async function sendEmail(email: OrderEmail, idempotencyKey: string): Promise<string> {
  const { data, error } = await resend().emails.send(
    {
      from: orderFromEmail.value(),
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text
    },
    { idempotencyKey }
  );
  if (error || !data) {
    logger.error('Resend rejected an order email', { to: email.to, subject: email.subject, error });
    throw new Error(`Resend send failed: ${error?.message ?? 'no response'}`);
  }
  return data.id;
}

/**
 * A direct download link for the uploaded notice, so the email works for
 * anyone it reaches without a Firebase login. Uses a Firebase Storage
 * download token: the link does not expire, and can be revoked in the
 * console (Storage → file → revoke access token). Returns null rather than
 * failing the webhook if the file is missing.
 */
async function noticeDownloadUrl(signup: SignupRequest): Promise<string | null> {
  if (!signup.noticeUploadPath) {
    return null;
  }
  try {
    return await getDownloadURL(getStorage().bucket().file(signup.noticeUploadPath));
  } catch (error) {
    logger.warn('Could not create notice download link', {
      path: signup.noticeUploadPath,
      error
    });
    return null;
  }
}

function monitoringStatusFrom(subscription: Stripe.Subscription): MonitoringStatus {
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    default:
      return 'canceled';
  }
}

async function setMonitoringStatus(
  subscription: Stripe.Subscription,
  monitoringStatus: MonitoringStatus
): Promise<void> {
  const signupId = subscription.metadata?.['signupId'];
  if (signupId) {
    await signups
      .doc(signupId)
      .update({ monitoringStatus, updatedAt: FieldValue.serverTimestamp() });
    return;
  }
  await setMonitoringStatusForSubscriptionId(subscription.id, monitoringStatus);
}

async function setMonitoringStatusForSubscriptionId(
  subscriptionId: string,
  monitoringStatus: MonitoringStatus
): Promise<void> {
  const match = await signups.where('stripe.subscriptionId', '==', subscriptionId).limit(1).get();
  if (match.empty) {
    logger.warn('No signup for subscription', { subscriptionId });
    return;
  }
  await match.docs[0].ref.update({ monitoringStatus, updatedAt: FieldValue.serverTimestamp() });
}

/** Stripe fields arrive either as an id string or an expanded object. */
function id(value: string | { id: string } | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return typeof value === 'string' ? value : value.id;
}
