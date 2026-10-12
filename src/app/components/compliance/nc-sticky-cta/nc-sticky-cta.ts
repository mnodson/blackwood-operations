import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Persistent "start now" bar for visitors who are reading the detail sections
 * but have already decided. It stays out of the way while the hero or the
 * signup form is on screen, since both already carry the same call to action.
 */
@Component({
  selector: 'app-nc-sticky-cta',
  templateUrl: './nc-sticky-cta.html',
  styleUrl: './nc-sticky-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink]
})
export class NcStickyCtaComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isPastHero = signal(false);
  private readonly isNearFooter = signal(false);
  private readonly isSignupInView = signal(false);

  protected readonly isVisible = computed(
    () => this.isPastHero() && !this.isNearFooter() && !this.isSignupInView()
  );

  constructor() {
    afterNextRender(() => {
      this.watchScrollDepth();
      this.watchSignupSection();
    });
  }

  private watchScrollDepth(): void {
    const onScroll = () => {
      const distanceFromBottom =
        this.document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);

      this.isPastHero.set(window.scrollY > 500);
      // Step aside for the disclaimer and footer at the very bottom of the page.
      this.isNearFooter.set(distanceFromBottom < 240);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  private watchSignupSection(): void {
    const signup = this.document.getElementById('signup');
    if (!signup) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => this.isSignupInView.set(entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(signup);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
