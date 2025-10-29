import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface Testimonial {
  quote: string;
  author: string;
  title: string;
  company: string;
}

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestimonialsComponent {
  protected readonly testimonials = signal<Testimonial[]>([
    {
      quote: 'Donna\'s expertise in operational transformation was instrumental in scaling our firm. Her systematic approach and hands-on leadership helped us triple in size while maintaining quality.',
      author: 'Sarah Mitchell',
      title: 'Managing Partner',
      company: 'Growth Law Firm'
    },
    {
      quote: 'When our HITRUST certification was at risk, Donna stepped in and completely turned the project around. Her crisis management and accountability frameworks were exactly what we needed.',
      author: 'David Chen',
      title: 'CTO',
      company: 'Healthcare Exchange'
    },
    {
      quote: 'Working with Blackwood Operations gave us access to senior-level operational expertise without the full-time commitment. The results speak for themselves—30% reduction in delivery timelines.',
      author: 'Maria Rodriguez',
      title: 'CEO',
      company: 'Tech Services Firm'
    }
  ]);
}
