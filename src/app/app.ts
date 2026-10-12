import { Component, ChangeDetectionStrategy, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './shared/analytics';
import { NavigationComponent } from './components/navigation/navigation';
import { FooterComponent } from './components/footer/footer';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavigationComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    // Browser only: the SDK touches window/document and has nothing to do during prerender.
    afterNextRender(() => void this.analytics.init());
  }
}
