import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Placeholder shown where the order summary will appear while the payment is
 * confirmed: a card being verified, cycling status lines, and skeleton rows
 * shaped like the summary that replaces it. Pure CSS animation; it stills
 * itself for visitors who prefer reduced motion.
 */
@Component({
  selector: 'app-payment-progress',
  templateUrl: './payment-progress.html',
  styleUrl: './payment-progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentProgress {
  /** Announced to screen readers in place of the cycling visual steps. */
  readonly label = input.required<string>();

  /** Exactly three short lines, shown in turn. */
  readonly steps = input.required<readonly [string, string, string]>();
}
