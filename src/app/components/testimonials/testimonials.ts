import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface Testimonial {
  quote: string;
  title: string;
  company: string;
  icon: string;
}

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestimonialsComponent {
  protected readonly expandedIndex = signal<number | null>(null);

  protected toggleExpand(index: number): void {
    this.expandedIndex.update(current => current === index ? null : index);
  }

  protected readonly testimonials = signal<Testimonial[]>([
    {
      quote: 'Donna\'s expertise in operational transformation was instrumental in scaling our firm. Her systematic approach and hands-on leadership helped us triple in size while maintaining quality.',
      title: 'Managing Partner',
      company: 'Growth Law Firm',
      icon: 'gavel'
    },
    {
      quote: 'When our HITRUST certification was at risk, Donna stepped in and completely turned the project around. Her crisis management and accountability frameworks were exactly what we needed.',
      title: 'CTO',
      company: 'Healthcare Exchange',
      icon: 'health_and_safety'
    },
    {
      quote: 'Working with Blackwood Operations gave us access to senior-level operational expertise without the full-time commitment. The results speak for themselves—30% reduction in delivery timelines.',
      title: 'CEO',
      company: 'Tech Services Firm',
      icon: 'rocket_launch'
    }
  ]);
}
