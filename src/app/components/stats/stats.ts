import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface Stat {
  value: string;
  label: string;
  suffix?: string;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsComponent {
  protected readonly stats = signal<Stat[]>([
    {
      value: '25',
      suffix: '+',
      label: 'Years of Experience'
    },
    {
      value: '30',
      suffix: '%',
      label: 'Average Timeline Reduction'
    },
    {
      value: '100',
      suffix: '%',
      label: 'Client Satisfaction'
    },
    {
      value: '50',
      suffix: '+',
      label: 'Successful Engagements'
    }
  ]);
}
