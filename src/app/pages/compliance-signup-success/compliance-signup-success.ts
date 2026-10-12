import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  isDevMode,
  signal
} from '@angular/core';
import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BILLING_PORTAL_URL } from '../../shared/billing';
import { CheckoutService, CheckoutSummary } from '../../shared/checkout';
import { findPlan } from '../../shared/plans';
import { PaymentProgress } from './payment-progress/payment-progress';

/**
 * `loading` while Stripe is asked; `confirmed` once it reports the session
 * paid; `processing` if it has not settled yet; `declined` if a delayed
 * payment failed; `unverified` when there is no session id or the lookup
 * fails, in which case the page claims nothing it could not check.
 */
type VerifyState = 'loading' | 'confirmed' | 'processing' | 'declined' | 'unverified';

/**
 * Landing page after Stripe Checkout. Stripe redirects here with
 * ?session_id=…; the page confirms that session with the backend before
 * showing the order. Fulfilment never depends on this page — the webhook is
 * the source of truth — so a visitor who closes the tab loses nothing.
 */
@Component({
  selector: 'app-compliance-signup-success',
  templateUrl: './compliance-signup-success.html',
  styleUrl: './compliance-signup-success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, PaymentProgress, RouterLink]
})
export class ComplianceSignupSuccessPage {
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutService);
  private readonly document = inject(DOCUMENT);

  protected readonly billingPortalUrl = BILLING_PORTAL_URL;
  protected readonly state = signal<VerifyState>('loading');
  protected readonly summary = signal<CheckoutSummary | null>(null);
  protected readonly plan = computed(() => findPlan(this.summary()?.plan));

  /** Sends a declined visitor back to the form with their choices kept. */
  protected readonly retryParams = computed(() => ({
    plan: this.summary()?.plan ?? null,
    monitoring: this.monitoring() ? 1 : null
  }));

  /** Prefer what Stripe reports; fall back to the return URL's hint. */
  protected readonly monitoring = computed(
    () =>
      this.summary()?.monitoring ??
      this.route.snapshot.queryParamMap.get('monitoring') === '1'
  );

  protected readonly nextSteps = computed(() => [
    {
      icon: 'mark_email_read',
      title: 'Receipt on its way',
      body: this.monitoring()
        ? 'Stripe emails your receipt now. Monitoring is billed monthly and you can cancel anytime.'
        : 'Stripe emails your receipt now. This was a one-time payment — nothing recurring.'
    },
    {
      icon: 'edit_document',
      title: 'We start on your notice',
      body: 'We review what you told us and draft a corrected Notice of Privacy Practices for your practice and states.'
    },
    {
      icon: 'schedule',
      title: 'Delivered within five business days',
      body: this.monitoring()
        ? 'Your notice arrives in every format you need, and we keep it current from there.'
        : 'Your notice arrives in every format you need, and it is yours to keep.'
    }
  ]);

  constructor() {
    const params = this.route.snapshot.queryParamMap;

    // Dev-only: ?preview=loading|processing|confirmed|declined|unverified shows a state
    // with sample data, no checkout needed. Ignored in production builds.
    const preview = isDevMode() ? params.get('preview') : null;
    if (preview) {
      void this.showPreview(preview);
      return;
    }

    void this.verify(params.get('session_id'));
  }

  private async showPreview(preview: string): Promise<void> {
    const sample: CheckoutSummary = {
      outcome: preview === 'processing' ? 'processing' : preview === 'declined' ? 'failed' : 'paid',
      plan: 'practice',
      monitoring: true,
      amountTotal: 109400,
      currency: 'usd',
      email: 'jordan@example.com',
      practiceName: 'Riverside Family Dental'
    };

    switch (preview) {
      case 'loading':
        return; // Hold on the confirming animation indefinitely.
      case 'processing':
      case 'declined':
        this.summary.set(sample);
        this.state.set(preview);
        return;
      case 'confirmed':
        // Plays the real sequence: animation for the minimum wait, then the summary.
        await delay(MIN_LOADING_MS);
        this.summary.set(sample);
        this.state.set('confirmed');
        return;
      default:
        this.state.set('unverified');
    }
  }

  private async verify(sessionId: string | null): Promise<void> {
    if (!sessionId) {
      this.state.set('unverified');
      return;
    }

    // Stripe usually answers in well under a second; hold the confirming state
    // long enough for its three status lines to play instead of flashing past.
    const minimumWait = this.prefersReducedMotion() ? Promise.resolve() : delay(MIN_LOADING_MS);

    try {
      const summary = await withRetries(() => this.checkout.getCheckoutSummary(sessionId));
      await minimumWait;
      this.summary.set(summary);
      this.state.set(STATE_FOR_OUTCOME[summary.outcome]);
    } catch {
      await minimumWait;
      this.state.set('unverified');
    }
  }

  private prefersReducedMotion(): boolean {
    return this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}

/** Matches the payment-progress cycle: all three lines show before the summary. */
const MIN_LOADING_MS = 4000;

const STATE_FOR_OUTCOME: Record<CheckoutSummary['outcome'], VerifyState> = {
  paid: 'confirmed',
  processing: 'processing',
  failed: 'declined'
};

/**
 * Waits before each retry of the payment lookup. A cold start or network blip
 * should not tell a customer who has paid that we could not confirm it.
 */
const RETRY_DELAYS_MS = [1000, 3000];

async function withRetries<T>(attempt: () => Promise<T>): Promise<T> {
  for (const wait of RETRY_DELAYS_MS) {
    try {
      return await attempt();
    } catch {
      await delay(wait);
    }
  }
  return attempt();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
