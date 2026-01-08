import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive]
})
export class NavigationComponent implements OnInit, OnDestroy {
  private document = inject(DOCUMENT);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly isVisible = signal(false);

  private lastScrollY = 0;
  private scrollListener?: () => void;

  ngOnInit(): void {
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private setupScrollListener(): void {
    this.scrollListener = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when scrolling down past 50px threshold
      if (currentScrollY > 50) {
        this.isVisible.set(true);
      } else {
        // Hide when back at top
        this.isVisible.set(false);
      }

      this.lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(value => !value);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
