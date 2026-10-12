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
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
