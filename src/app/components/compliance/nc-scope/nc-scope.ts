import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-nc-scope',
  templateUrl: './nc-scope.html',
  styleUrl: './nc-scope.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NcScopeComponent {
  protected readonly reviewChecks = signal<string[]>([
    'Whether it reflects the February 2026 Part 2 requirements',
    'Whether it still contains language from the vacated 2024 reproductive health rule',
    'Whether it addresses the health privacy laws in your state',
    'Whether it covers the required patient rights and contact information',
    'When it was last revised, and what has changed since'
  ]);

  /**
   * Placeholder until the Notice Check upload endpoint exists. Matches the
   * mailto pattern already used on the contact page.
   */
  protected readonly reviewMailto =
    'mailto:admin@blackwoodops.com' +
    '?subject=' +
    encodeURIComponent('Free Notice Check request') +
    '&body=' +
    encodeURIComponent(
      'Hi Donna,\n\n' +
        'I would like a free Notice Check. My current Notice of Privacy Practices is attached.\n\n' +
        'Practice name:\nPractice type:\nState(s) where we practice:\nNumber of providers:\n\n' +
        'Thank you.'
    );
}
