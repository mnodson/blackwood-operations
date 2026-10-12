import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  signal,
  inject
} from '@angular/core';

interface TimelineEntry {
  date: string;
  /** Which way this change pushed a practice's notice. */
  direction: 'add' | 'remove';
  body: string;
}

@Component({
  selector: 'app-nc-changed',
  templateUrl: './nc-changed.html',
  styleUrl: './nc-changed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NcChangedComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);

  protected readonly visibleEntries = signal<Set<number>>(new Set());

  private intersectionObserver?: IntersectionObserver;

  protected readonly timeline = signal<TimelineEntry[]>([
    {
      date: 'April 2024',
      direction: 'add',
      body:
        'HHS finalized a rule adding heightened protections for reproductive health information. ' +
        'Covered entities were told to revise their notices by December 23, 2024. Many did.'
    },
    {
      date: 'June 2025',
      direction: 'remove',
      body:
        'A federal court in Texas vacated that rule nationwide in Purl v. HHS. The Fifth Circuit ' +
        'dismissed the appeal in September 2025. The language practices had just added was no ' +
        'longer required, and the underlying protections no longer applied.'
    },
    {
      date: 'February 16, 2026',
      direction: 'add',
      body:
        'A separate requirement survived the same ruling. Every HIPAA covered entity that creates, ' +
        'receives, maintains, or transmits substance use disorder records under 42 CFR Part 2 was ' +
        'required to revise its notice by this date. That includes practices that have never ' +
        'considered themselves substance use providers, because Part 2 records travel through ' +
        'referrals, care coordination, and integrated care arrangements. OCR began accepting ' +
        'related complaints on the same day.'
    }
  ]);

  ngAfterViewInit(): void {
    setTimeout(() => this.setupIntersectionObserver(), 100);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }
          const index = Number(entry.target.getAttribute('data-index') ?? 0);
          this.visibleEntries.update(set => new Set(set).add(index));
        });
      },
      { root: null, rootMargin: '-10% 0px -10% 0px', threshold: 0.2 }
    );

    const entries: NodeListOf<Element> =
      this.elementRef.nativeElement.querySelectorAll('.nc-timeline-entry');
    entries.forEach(entry => this.intersectionObserver!.observe(entry));
  }

  protected isVisible(index: number): boolean {
    return this.visibleEntries().has(index);
  }
}
