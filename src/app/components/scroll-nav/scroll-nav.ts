import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, AfterViewInit, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

interface NavSection {
  id: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-scroll-nav',
  templateUrl: './scroll-nav.html',
  styleUrl: './scroll-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollNavComponent implements OnInit, AfterViewInit, OnDestroy {
  private document = inject(DOCUMENT);

  protected readonly isVisible = signal(false);
  protected readonly activeSection = signal<string>('');

  protected readonly sections = signal<NavSection[]>([
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'case-studies', label: 'Case Studies' },
    { id: 'assessment', label: 'Free Assessment' },
    { id: 'testimonials', label: 'Testimonials' }
  ]);

  private intersectionObserver?: IntersectionObserver;
  private scrollListener?: () => void;

  ngOnInit(): void {
    this.setupScrollListener();
  }

  ngAfterViewInit(): void {
    // Delay observer setup to ensure all sibling components are rendered
    setTimeout(() => this.setupIntersectionObserver(), 300);
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private setupScrollListener(): void {
    this.scrollListener = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = this.document.documentElement.scrollHeight;

      // Distance from bottom of page
      const distanceFromBottom = documentHeight - (scrollPosition + windowHeight);

      // Show nav after scrolling 300px AND when not near bottom (more than 200px from bottom)
      const isPastTop = scrollPosition > 300;
      const isNotAtBottom = distanceFromBottom > 200;

      this.isVisible.set(isPastTop && isNotAtBottom);
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: 0.1
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      // Sort entries by their position to ensure we activate the topmost visible section
      const sortedEntries = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });

      if (sortedEntries.length > 0) {
        const sectionId = sortedEntries[0].target.id;
        this.activeSection.set(sectionId);
      }
    }, options);

    // Observe all sections
    this.sections().forEach((section) => {
      const element = this.document.getElementById(section.id);
      if (element) {
        this.intersectionObserver!.observe(element);
      }
    });
  }

  protected scrollToSection(sectionId: string): void {
    const element = this.document.getElementById(sectionId);
    if (element) {
      const yOffset = -80; // Offset for fixed header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  protected isActive(sectionId: string): boolean {
    return this.activeSection() === sectionId;
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.hash = '';
  }
}
