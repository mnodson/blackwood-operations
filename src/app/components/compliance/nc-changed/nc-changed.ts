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
      date: 'March 2024',
      direction: 'add',
      body:
        'Your privacy policy alone is not sufficient. Washington now requires a second one, just ' +
        'for health data, with its own link on your homepage. And it isn’t only the Attorney ' +
        'General you answer to: consumers can take you to court themselves.'
    },
    {
      date: 'July 2024',
      direction: 'add',
      body:
        'Texas made the notice itself the obligation. It must name the categories of personal ' +
        'data you process, including sensitive data, why you process it, who you share it with, ' +
        'and how a consumer can appeal when you deny their request. Leave a piece out and each ' +
        'violation can cost up to $7,500.'
    },
    {
      date: 'July 2025',
      direction: 'add',
      body:
        'Minnesota went after the data HIPAA leaves behind. Health information on your website, ' +
        'in your marketing, anywhere HIPAA doesn’t reach, now needs consent. If your systems ' +
        'profile people to make decisions about their healthcare, education, or employment, they ' +
        'can question the result and demand an explanation. And the grace period for fixing ' +
        'mistakes is over.'
    },
    {
      date: 'February 2026',
      direction: 'add',
      body:
        'You may hold substance use disorder records without realizing it. They arrive through ' +
        'referrals, care coordination, and integrated care, and every HIPAA covered entity ' +
        'holding them had to update its notice. Under 42 CFR Part 2, you have specific ' +
        'obligations, and OCR is already taking complaints.'
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
