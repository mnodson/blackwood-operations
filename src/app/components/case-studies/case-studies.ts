import { Component, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

interface CaseStudy {
  title: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-case-studies',
  templateUrl: './case-studies.html',
  styleUrl: './case-studies.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage]
})
export class CaseStudiesComponent implements OnInit, OnDestroy {
  protected readonly caseStudies = signal<CaseStudy[]>([
    {
      title: 'Scaled a Growing Law Firm',
      description: 'Acted as a fractional COO to support a fast-growing law firm that tripled in size by leading operational transformation. Delivered scalable process design, workflow automation across key platforms, vendor portfolio management, and a strategic project roadmap aligned with growth goals.',
      image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'HITRUST Certification for Healthcare Exchange',
      description: 'Led a successful HITRUST r2 assessment for a healthcare exchange amid organizational challenges and delays. Stabilized the project post-crisis, drove accountability, and ensured compliance under tight regulatory deadlines.',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Strategic Advisory for Investment Bank',
      description: 'Collaborated with a boutique investment bank serving startups to develop go-to-market and fundraising strategies. Developed investor-ready pitch decks, refined business models, and supported executive communications to secure funding.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Fractional COO for Tech Services Firm',
      description: 'Partnered with a mid-stage tech services company facing operational strain. Established KPIs, implemented a lean PMO, aligned cross-functional teams, and streamlined client onboarding, reducing delivery timelines by 30% and boosting accountability.',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80'
    }
  ]);

  protected readonly currentIndex = signal(0);
  protected readonly isAnimating = signal(false);
  protected readonly isPaused = signal(false);

  protected readonly totalSlides = computed(() => this.caseStudies().length);
  protected readonly translateX = computed(() => `translateX(-${this.currentIndex() * 100}%)`);

  private autoPlayInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  private startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.nextSlide();
      }
    }, 5000);
  }

  private stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  pauseAutoPlay() {
    this.isPaused.set(true);
  }

  resumeAutoPlay() {
    this.isPaused.set(false);
  }

  nextSlide() {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.currentIndex.update(index =>
      index === this.caseStudies().length - 1 ? 0 : index + 1
    );

    setTimeout(() => {
      this.isAnimating.set(false);
    }, 500);
  }

  previousSlide() {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.currentIndex.update(index =>
      index === 0 ? this.caseStudies().length - 1 : index - 1
    );

    setTimeout(() => {
      this.isAnimating.set(false);
    }, 500);
  }

  goToSlide(targetIndex: number) {
    if (this.isAnimating() || targetIndex === this.currentIndex()) return;

    this.isAnimating.set(true);
    this.currentIndex.set(targetIndex);

    setTimeout(() => {
      this.isAnimating.set(false);
    }, 500);
  }
}
