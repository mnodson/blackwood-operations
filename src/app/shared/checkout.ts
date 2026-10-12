import { Injectable } from '@angular/core';
import { getFirebaseApp } from './firebase';
import { noticeContentType, noticeFileProblem } from './notice-file';
import type { PlanId } from './plans';

/** Mirrors `functions/src/signup.ts` — keep both in step. */
export interface SignupRequest {
  plan: PlanId;
  /** Adds the monthly monitoring subscription on top of the one-time update. */
  monitoring: boolean;
  practice: {
    name: string;
    type: string;
    typeOther?: string;
    locationCount: number;
    /** Two-letter codes from `US_STATES`. */
    states: string[];
    hasNotice: 'Yes' | 'No' | 'Not sure';
  };
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  /** Storage paths of the optional notice uploads, at most `MAX_NOTICE_FILES`. */
  noticeUploadPaths?: string[];
  /** The visitor has more documents than they could attach and wants us to collect them. */
  moreDocuments: boolean;
  /** Customer-facing promotion code from a ?promo= link. */
  promoCode?: string;
}

export interface CheckoutSession {
  url: string;
  signupId: string;
}

/**
 * Thrown with a message safe to show the visitor. `field` names the input at
 * fault and, for a refused notice, `noticeIndex` says which of the uploads.
 */
export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly field?: 'notice',
    readonly noticeIndex?: number
  ) {
    super(message);
  }
}

/**
 * Talks to the Cloud Functions backend for the compliance signup. Card details
 * never pass through here: `startCheckout` returns the URL of Stripe's hosted
 * page and the visitor is sent there to pay.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  /**
   * Uploads the visitor's current notice and returns the Storage path to send
   * along with the signup. The folder id is random so uploads never collide
   * and cannot be guessed.
   */
  async uploadNotice(file: File): Promise<string> {
    const { getStorage, ref, uploadBytes, connectStorageEmulator } = await import(
      'firebase/storage'
    );

    const problem = noticeFileProblem(file);
    if (problem) {
      throw new CheckoutError(problem, 'notice');
    }

    const storage = getStorage(await getFirebaseApp());
    if (useEmulators()) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }

    const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(0, 200) || 'notice';
    const path = `notice-uploads/${crypto.randomUUID()}/${safeName}`;

    try {
      await uploadBytes(ref(storage, path), file, { contentType: noticeContentType(file) ?? file.type });
    } catch {
      throw new CheckoutError(
        'We could not upload your notice. You can remove it and continue, or try again.',
        'notice'
      );
    }

    return path;
  }

  async startCheckout(request: SignupRequest): Promise<CheckoutSession> {
    const createCheckoutSession = await callable<SignupRequest, CheckoutSession>(
      'createCheckoutSession'
    );

    try {
      const result = await createCheckoutSession(request);
      return result.data;
    } catch (error) {
      const field = fieldFor(error);
      const noticeIndex = field === 'notice' ? request.noticeUploadPaths?.indexOf(noticePathFor(error)) : undefined;
      throw new CheckoutError(messageFor(error), field, noticeIndex === -1 ? undefined : noticeIndex);
    }
  }

  /** Confirms a completed checkout with Stripe for the success page. */
  async getCheckoutSummary(sessionId: string): Promise<CheckoutSummary> {
    const getCheckoutSummary = await callable<{ sessionId: string }, CheckoutSummary>(
      'getCheckoutSummary'
    );
    const result = await getCheckoutSummary({ sessionId });
    return result.data;
  }
}

/** Mirrors the return value of `getCheckoutSummary` in `functions/src/index.ts`. */
export interface CheckoutSummary {
  /** `failed` only happens with delayed payment methods; card declines stay on Stripe's page. */
  outcome: 'paid' | 'processing' | 'failed';
  plan: PlanId | null;
  monitoring: boolean;
  /** In cents. */
  amountTotal: number | null;
  currency: string | null;
  email: string | null;
  practiceName: string | null;
}

async function callable<Request, Response>(name: string) {
  const { getFunctions, httpsCallable, connectFunctionsEmulator } = await import(
    'firebase/functions'
  );

  const functions = getFunctions(await getFirebaseApp());
  if (useEmulators()) {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  }

  return httpsCallable<Request, Response>(functions, name);
}

/**
 * Flip to true to point `ng serve` at `npm run emulators` instead of the
 * deployed backend. Off by default so local dev works against the live
 * (test-mode) functions without running anything else.
 */
const USE_EMULATORS = false;

function useEmulators(): boolean {
  return USE_EMULATORS;
}

function fieldFor(error: unknown): 'notice' | undefined {
  const details = (error as { details?: { field?: string } }).details;
  return details?.field === 'notice' ? 'notice' : undefined;
}

/** The Storage path of the notice the server refused. */
function noticePathFor(error: unknown): string {
  return (error as { details?: { path?: string } }).details?.path ?? '';
}

function messageFor(error: unknown): string {
  const code = (error as { code?: string }).code;

  if (code === 'functions/not-found') {
    return 'That promotion code is not valid for this order. Remove it from the link or contact admin@blackwoodops.com.';
  }

  // The server inspected the uploaded notice and says why it was refused.
  if (fieldFor(error) === 'notice') {
    return (error as Error).message;
  }

  if (code === 'functions/invalid-argument') {
    return 'Something in the form did not look right. Please check your answers and try again.';
  }

  return 'We could not start checkout just now. Please try again in a moment or email admin@blackwoodops.com.';
}
