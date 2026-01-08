import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class HeroComponent implements OnInit, OnDestroy {
  protected readonly logoOpacity = signal(1);

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
      const scrollY = window.scrollY;
      // Fade out logo over 50px of scroll (matches navbar appearance)
      const opacity = Math.max(0, 1 - scrollY / 50);
      this.logoOpacity.set(opacity);
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }
}
