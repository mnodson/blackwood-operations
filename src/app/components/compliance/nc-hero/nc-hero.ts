import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The 42 CFR Part 2 notice deadline. Everything in the hero is measured from here. */
const PART_TWO_DEADLINE = new Date(2026, 1, 16);

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
      date: 'April 2024',
      direction: 'add',
      body: 'HHS required reproductive health language in every notice. Most practices added it.',
      status: 'Added'
    },
    {
      date: 'June 2025',
      direction: 'remove',
      body: 'A federal court vacated that rule nationwide. The language has to come back out.',
      status: 'Reversed'
    },
    {
      date: 'February 16, 2026',
      direction: 'add',
      body:
        'Part 2 substance use disclosures became mandatory — including for practices that have ' +
        'never considered themselves substance use providers.',
      status: 'Still in force'
    }
  ]);

  /**
   * Read once per page load rather than held as reactive state — the hero only needs
   * to know which side of the deadline today falls on, and by how far.
   */
  private readonly today = signal(new Date());

  protected readonly monthsSinceDeadline = computed(() => {
    const today = this.today();
    const months =
      (today.getFullYear() - PART_TWO_DEADLINE.getFullYear()) * 12 +
      (today.getMonth() - PART_TWO_DEADLINE.getMonth()) +
      (today.getDate() >= PART_TWO_DEADLINE.getDate() ? 0 : -1);

    return months;
  });

  protected readonly isPastDeadline = computed(() => this.monthsSinceDeadline() >= 0);

  /** "7 months" / "1 month" — the elapsed figure used in the "you are here" line. */
  protected readonly elapsedLabel = computed(() => {
    const months = Math.abs(this.monthsSinceDeadline());

    if (months < 1) {
      return 'less than a month';
    }

    return months === 1 ? '1 month' : `${months} months`;
  });

  protected readonly todayLabel = computed(() =>
    this.today().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
}
