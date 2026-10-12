import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import type { Analytics } from 'firebase/analytics';
import { getFirebaseApp } from './firebase';

/**
 * Firebase Analytics, loaded lazily and only in the browser. The SDK is pulled
 * in with a dynamic import so it stays out of the initial bundle, and every
 * call is a no-op if analytics is unsupported (server render, unsupported
 * browser, or a blocked measurement endpoint).
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private analytics: Analytics | null = null;

  /** Call once, from a browser-only hook. */
  async init(): Promise<void> {
    const { getAnalytics, isSupported } = await import('firebase/analytics');

    if (!(await isSupported())) {
      return;
    }

    this.analytics = getAnalytics(await getFirebaseApp());
    this.trackPageViews();
  }

  /** The SDK only logs the first load, so SPA navigations are sent by hand. */
  private trackPageViews(): void {
    const subscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.logPageView(event.urlAfterRedirects));

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  private async logPageView(path: string): Promise<void> {
    if (!this.analytics) {
      return;
    }

    const { logEvent } = await import('firebase/analytics');

    logEvent(this.analytics, 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title
    });
  }
}
