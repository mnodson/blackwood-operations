import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-cta',
  templateUrl: './cta.html',
  styleUrl: './cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CtaComponent {
  protected readonly calendlyUrl = signal('https://calendly.com/donna-nodson/30min');
}
