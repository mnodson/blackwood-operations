import { isDevMode } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';

/**
 * Firebase web app configuration for the blackwood-operations project.
 *
 * These values are public by design — they identify the project to Google's
 * APIs and ship in the browser bundle either way. Access is controlled by
 * Firebase security rules and the API key's HTTP referrer restrictions, not
 * by keeping this object secret.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAp6_xrOZlqRFd3eR4YR7z8KgPKEpU1Ofg',
  authDomain: 'blackwood-operations.firebaseapp.com',
  projectId: 'blackwood-operations',
  storageBucket: 'blackwood-operations.firebasestorage.app',
  messagingSenderId: '199329730668',
  appId: '1:199329730668:web:5c1298e7f49b7feed04849',
  measurementId: 'G-8F459C0YQ6'
};

/**
 * Shared app instance. Every Firebase SDK is loaded with a dynamic import so
 * it stays out of the initial bundle; this gives them one app to attach to
 * instead of each calling `initializeApp` (which throws on the second call).
 */
export async function getFirebaseApp() {
  const { getApps, getApp, initializeApp } = await import('firebase/app');
  if (getApps().length) {
    return getApp();
  }

  const app = initializeApp(firebaseConfig);
  await startAppCheck(app);
  return app;
}

/**
 * reCAPTCHA Enterprise site key registered for this web app in Firebase
 * console → App Check. Public by design. While empty, App Check is off and
 * requests carry no token; see `enforceAppCheck` in functions/src/config.ts.
 */
const APP_CHECK_SITE_KEY = '6LfQw-stAAAAABdaFDcw2nv8lH2FBhPRaq19mkyN';

/**
 * Attaches an App Check token to every Functions and Storage request, proving
 * it came from this site rather than a script. Invisible to visitors.
 */
async function startAppCheck(app: FirebaseApp): Promise<void> {
  if (!APP_CHECK_SITE_KEY) {
    return;
  }

  // Local builds cannot pass reCAPTCHA; they print a debug token to the
  // console instead, which can be allowed under App Check → Manage debug tokens.
  if (isDevMode()) {
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}
