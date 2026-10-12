import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink]
})
export class FooterComponent {
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly socialLinks = signal<SocialLink[]>([
    {
      name: 'Blackwood Operations - LinkedIn',
      url: 'https://www.linkedin.com/company/blackwood-operations',
      icon: 'linkedin-company'
    },
    {
      name: 'Donna Nodson - LinkedIn',
      url: 'https://www.linkedin.com/in/donnanodson/',
      icon: 'linkedin-personal'
    }
  ]);
}
