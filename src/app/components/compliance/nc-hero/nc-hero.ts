import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface HeroChange {
  date: string;
  /** Which way this change pushed a practice's notice. */
  direction: 'add' | 'remove';
  body: string;
  status: string;
}

@Component({
  selector: 'app-nc-hero',
  templateUrl: './nc-hero.html',
  styleUrl: './nc-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink]
})
export class NcHeroComponent {
  /** The short version of the timeline in "What actually changed" — the hook itself. */
  protected readonly changes = signal<HeroChange[]>([
    {
      date: 'March 2013 · FEDERAL',
      direction: 'add',
      body:
        'The HIPAA Omnibus Rule added new patient rights every notice had to include, and made ' +
        'business associates directly liable for protecting health information.',
      status: 'Added'
    },
    {
      date: 'As of 2023 · STATE',
      direction: 'add',
      body:
        'States started writing their own rules. By the end of 2023, thirteen states adopted ' +
        'privacy laws: California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, ' +
        'Montana, Oregon, Tennessee, Texas, Utah, and Virginia.',
      status: 'Added'
    },
    {
      date: 'February 2026 · FEDERAL',
      direction: 'add',
      body:
        'New substance use (Part 2) disclosures became mandatory in HIPAA notices, including at ' +
        'practices that have never considered themselves substance use providers.',
      status: 'Still in force'
    }
  ]);
}
