import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-cta',
  templateUrl: './cta.html',
  styleUrl: './cta.scss',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CtaComponent {
  protected readonly calendlyUrl = signal('https://calendly.com/donna-nodson/30min');
}
