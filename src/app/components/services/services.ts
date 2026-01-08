import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, AfterViewInit, ElementRef, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

interface Service {
  title: string;
  description: string;
  icon: string;
  highlight: string;
}

@Component({
  selector: 'app-services',
  templateUrl: './services.html',
  styleUrl: './services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage]
})
export class ServicesComponent implements OnInit, AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);

  protected readonly visibleItems = signal<Set<number>>(new Set());
  protected readonly lineProgress = signal(0);

  private intersectionObserver?: IntersectionObserver;
  private scrollListener?: () => void;

  protected readonly services = signal<Service[]>([
    {
      title: 'Process Design',
      description: 'Streamline operations with scalable, efficient processes tailored to your business needs.',
      icon: 'design_services',
      highlight: 'Foundation'
    },
    {
      title: 'Compliance & Risk Management',
      description: 'Navigate regulatory requirements and mitigate risks with expert guidance and implementation.',
      icon: 'verified_user',
      highlight: 'Protection'
    },
    {
      title: 'Technology Integration',
      description: 'Optimize your tech stack and workflows to drive efficiency and support growth.',
      icon: 'hub',
      highlight: 'Innovation'
    },
    {
      title: 'Fractional COO Services',
      description: 'Access senior operational leadership on-demand, without the full-time commitment.',
      icon: 'supervisor_account',
      highlight: 'Leadership'
    },
    {
      title: 'Strategic Advisory',
      description: 'Develop go-to-market strategies, refine business models, and secure funding with expert support.',
      icon: 'insights',
      highlight: 'Growth'
    },
    {
      title: 'Project Management',
      description: 'Establish lean PMOs, align cross-functional teams, and deliver results on time.',
      icon: 'task_alt',
      highlight: 'Delivery'
    }
  ]);

  ngOnInit(): void {
    this.setupScrollListener();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.setupIntersectionObserver(), 100);
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private setupScrollListener(): void {
    this.scrollListener = () => {
      const section = this.elementRef.nativeElement.querySelector('.services-journey');
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Calculate progress through the section
      const start = windowHeight * 0.8;
      const end = -sectionHeight + windowHeight * 0.2;
      const progress = Math.min(1, Math.max(0, (start - sectionTop) / (start - end)));

      this.lineProgress.set(progress);
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: '-10% 0px -10% 0px',
      threshold: 0.2
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
        if (entry.isIntersecting) {
          this.visibleItems.update(set => {
            const newSet = new Set(set);
            newSet.add(index);
            return newSet;
          });
        }
      });
    }, options);

    const items = this.elementRef.nativeElement.querySelectorAll('.milestone');
    items.forEach((item: Element) => {
      this.intersectionObserver!.observe(item);
    });
  }

  protected isVisible(index: number): boolean {
    return this.visibleItems().has(index);
  }
}
