import { Component, ChangeDetectionStrategy, signal, ElementRef, inject, AfterViewInit, OnDestroy } from '@angular/core';

interface Metric {
  value: number;
  displayValue: string;
  suffix: string;
  prefix: string;
  label: string;
  context: string;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsComponent implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private observer?: IntersectionObserver;
  private hasAnimated = false;

  protected readonly isVisible = signal(false);
  protected readonly animatedValues = signal<string[]>(['0%', '0x', '$0M']);

  private readonly metrics: Metric[] = [
    { value: 94, displayValue: '94', suffix: '%', prefix: '', label: 'Change Adoption Rate', context: 'vs. 34% industry average' },
    { value: 3.2, displayValue: '3.2', suffix: 'x', prefix: '', label: 'Faster Time-to-Value', context: 'Accelerated implementation cycles' },
    { value: 4.7, displayValue: '4.7', suffix: 'M', prefix: '$', label: 'Avg. Risk Mitigation', context: 'Per enterprise engagement' }
  ];

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasAnimated) {
            this.hasAnimated = true;
            this.isVisible.set(true);
            this.animateValues();
          }
        });
      },
      { threshold: 0.3 }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  private animateValues(): void {
    const duration = 2000;
    const fps = 60;
    const frames = duration / (1000 / fps);

    let frame = 0;

    const animate = () => {
      frame++;
      const progress = this.easeOutQuart(frame / frames);

      const newValues = this.metrics.map((metric) => {
        const currentValue = metric.value * progress;
        const formatted = metric.value % 1 === 0
          ? Math.round(currentValue).toString()
          : currentValue.toFixed(1);
        return `${metric.prefix}${formatted}${metric.suffix}`;
      });

      this.animatedValues.set(newValues);

      if (frame < frames) {
        requestAnimationFrame(animate);
      } else {
        const finalValues = this.metrics.map(
          (m) => `${m.prefix}${m.displayValue}${m.suffix}`
        );
        this.animatedValues.set(finalValues);
      }
    };

    requestAnimationFrame(animate);
  }

  private easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }
}
