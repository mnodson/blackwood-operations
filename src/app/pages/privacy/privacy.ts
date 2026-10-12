import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PolicySection {
  id: string;
  heading: string;
}

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink]
})
export class PrivacyPage {
  /** Last substantive revision to the policy text below. */
  protected readonly lastUpdated = signal('September 15, 2026');

  protected readonly sections = signal<PolicySection[]>([
    { id: 'what-we-collect', heading: 'What we collect' },
    { id: 'how-we-use-it', heading: 'How we use it' },
    { id: 'who-we-share-it-with', heading: 'Who we share it with' },
    { id: 'uploads', heading: 'Documents you upload' },
    { id: 'cookies', heading: 'Cookies and third-party embeds' },
    { id: 'retention', heading: 'How long we keep it' },
    { id: 'your-choices', heading: 'Your choices' },
    { id: 'security', heading: 'Security' },
    { id: 'contact-us', heading: 'Contact us' }
  ]);
}
