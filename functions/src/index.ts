import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import type Stripe from 'stripe';
import {
  allowedOrigins,
  appOrigin,
  billingPortalUrl,
  enforceAppCheck,
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
  teamMonitoringEmail,
  teamOrderEmail,
  type MonitoringAlert,
  type OrderDetails,
  type OrderEmail,
  type OrderOutcome,
  type UploadedNotice
} from './notify.js';
import { checkNoticeUpload, NoticeRejectedError } from './notice.js';
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
  { secrets: [stripeSecretKey], cors: allowedOrigins, enforceAppCheck },
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

    // Every upload is checked; the first refused one is reported, naming its path
    // so the form can remove just that file.
    const paths = signup.noticeUploadPaths ?? [];
    const checks = await Promise.allSettled(paths.map(path => checkNoticeUpload(path)));
    const refused = checks.findIndex(check => check.status === 'rejected');
    if (refused > -1) {
      const error = (checks[refused] as PromiseRejectedResult).reason;
      if (error instanceof NoticeRejectedError) {
        logger.warn('Notice upload rejected', { path: paths[refused], reason: error.message });
        throw new HttpsError('invalid-argument', error.message, { field: 'notice', path: paths[refused] });
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
    // Codes are only taken from ?promo= links. Checkout's own promo field is
    // left off: its bot check can fail with a 403 and no visible challenge.
    ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
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
  { secrets: [stripeSecretKey], cors: allowedOrigins, enforceAppCheck },
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
    // The receipt is a claim, not a record of success: if this run dies
    // mid-way (timeout, crash), the claim lapses and Stripe's retry runs again.
    const receipt = db.collection('stripeEvents').doc(event.id);
    const claim = await db.runTransaction(async tx => {
      const existing = await tx.get(receipt);
      // Receipts from before claims existed have no state and were handled.
      const state = existing.get('state') as 'processing' | 'done' | undefined;
      if (existing.exists && state !== 'processing') {
        return 'done';
      }
      const startedAt = existing.get('startedAt') as Timestamp | undefined;
      if (startedAt && Date.now() - startedAt.toMillis() < WEBHOOK_CLAIM_MS) {
        return 'in_progress';
      }
      tx.set(receipt, { type: event.type, state: 'processing', startedAt: Timestamp.now() });
      return 'claimed';
    });

    if (claim === 'done') {
      res.status(200).send('Already processed');
      return;
    }
    if (claim === 'in_progress') {
      // Another delivery is handling it; ask Stripe to check back later.
      res.status(409).send('In progress');
      return;
    }

    try {
      await handleEvent(event);
      await receipt.update({ state: 'done', doneAt: FieldValue.serverTimestamp() });
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Webhook handler failed', { eventId: event.id, type: event.type, error });
      // Clear the receipt so Stripe's retry gets a real second attempt.
      await receipt.delete();
      res.status(500).send('Handler failed');
    }
  }
);

/** Longer than the webhook's 60s timeout, so a live run is never claimed twice. */
const WEBHOOK_CLAIM_MS = 5 * 60 * 1000;

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

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await setMonitoringStatus(subscription.id, monitoringStatusFrom(subscription), signupIdOfSubscription(subscription));
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const signup = await setMonitoringStatus(subscription.id, 'canceled', signupIdOfSubscription(subscription));
      if (signup) {
        await sendMonitoringAlert(event, 'canceled', signup, {
          subscriptionId: subscription.id,
          livemode: subscription.livemode
        });
      }
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = id(invoice.parent?.subscription_details?.subscription);
      if (!subscriptionId) {
        return;
      }
      const signup = await setMonitoringStatus(subscriptionId, 'past_due');
      if (signup) {
        await sendMonitoringAlert(event, 'payment_failed', signup, {
          subscriptionId,
          livemode: invoice.livemode,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hosted_invoice_url
        });
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
    notices: await uploadedNotices(signup)
  };

  const emails: [string, OrderEmail][] = [
    [`team-${outcome}`, teamOrderEmail(outcome, orderNotifyEmail.value(), order)]
  ];
  if (outcome === 'paid') {
    emails.push([
      'customer-paid',
      customerConfirmationEmail(orderReplyToEmail.value(), billingPortalUrl.value(), order)
    ]);
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
 * The uploaded notices with a direct download link each, so the email works
 * for anyone it reaches without a Firebase login. Uses Firebase Storage
 * download tokens: the links do not expire, and can be revoked in the
 * console (Storage → file → revoke access token). A missing file gets a null
 * link rather than failing the webhook.
 */
async function uploadedNotices(
  signup: SignupRequest & { noticeUploadPath?: string }
): Promise<UploadedNotice[]> {
  // Signups saved before multiple uploads stored a single path.
  const paths = signup.noticeUploadPaths ?? (signup.noticeUploadPath ? [signup.noticeUploadPath] : []);

  return Promise.all(
    paths.map(async path => {
      let downloadUrl: string | null = null;
      try {
        downloadUrl = await getDownloadURL(getStorage().bucket().file(path));
      } catch (error) {
        logger.warn('Could not create notice download link', { path, error });
      }
      return { path, fileName: path.split('/').pop() ?? path, downloadUrl };
    })
  );
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

function signupIdOfSubscription(subscription: Stripe.Subscription): string | undefined {
  return subscription.metadata?.['signupId'];
}

/**
 * Records a monitoring status change on the signup that bought the
 * subscription, and returns that signup (null if none matches). The signupId
 * from subscription metadata is used when known, since a subscription event
 * can arrive before checkout.session.completed stores the subscription id.
 */
async function setMonitoringStatus(
  subscriptionId: string,
  monitoringStatus: MonitoringStatus,
  signupId?: string
): Promise<DocumentSnapshot | null> {
  if (signupId) {
    const ref = signups.doc(signupId);
    await ref.update({ monitoringStatus, updatedAt: FieldValue.serverTimestamp() });
    return ref.get();
  }

  const match = await signups.where('stripe.subscriptionId', '==', subscriptionId).limit(1).get();
  if (match.empty) {
    logger.warn('No signup for subscription', { subscriptionId });
    return null;
  }
  const signup = match.docs[0];
  await signup.ref.update({ monitoringStatus, updatedAt: FieldValue.serverTimestamp() });
  return signup;
}

/**
 * Tells the team a monitoring payment failed or a subscription ended. The
 * customer hears from Stripe directly (Settings → Billing → Subscriptions and
 * emails). Keyed on the event id, so Stripe's retries never send it twice.
 */
async function sendMonitoringAlert(
  event: Stripe.Event,
  alert: MonitoringAlert,
  signup: DocumentSnapshot,
  details: { subscriptionId: string; livemode: boolean; amountDue?: number | null; currency?: string | null; hostedInvoiceUrl?: string | null }
): Promise<void> {
  const email = teamMonitoringEmail(alert, orderNotifyEmail.value(), {
    signupId: signup.id,
    signup: signup.data() as SignupRequest,
    ...details
  });
  const resendId = await sendEmail(email, `monitoring-${event.id}`);
  logger.info('Monitoring alert sent', { signupId: signup.id, alert, resendId });
}

/** Stripe fields arrive either as an id string or an expanded object. */
function id(value: string | { id: string } | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return typeof value === 'string' ? value : value.id;
}
