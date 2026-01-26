import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

interface ExpertiseArea {
  title: string;
  description: string;
  image: string;
}

interface Leader {
  name: string;
  title: string;
  bio: string;
  expertise: ExpertiseArea[];
  linkedIn?: string;
  location?: string;
}

@Component({
  selector: 'app-leadership',
  templateUrl: './leadership.html',
  styleUrl: './leadership.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage]
})
export class LeadershipComponent {
  protected readonly leaders = signal<Leader[]>([
    {
      name: 'Donna Nodson',
      title: 'Founder & Principal Consultant',
      location: 'Dual citizen (US & UK) – eligible to work seamlessly across both regions',
      linkedIn: 'https://www.linkedin.com/in/donnanodson/',
      bio: `With over 25 years of global operational leadership, Donna has built a career transforming companies — from high-growth startups to Fortune 500 enterprises — into disciplined, scalable, and high-performing organizations. Her experience spans SaaS, professional services, manufacturing, financial services, and retail, with a consistent focus on turning operational complexity into competitive advantage.

A strategist and operator in equal measure, she's known for driving measurable impact: aligning vision to execution, building accountability into process, and delivering results under pressure. Whether leading a transformation, building infrastructure for scale, or optimizing performance across global teams, her leadership enables companies to move faster, smarter, and more profitably.`,
      expertise: [
        {
          title: 'Executive & Cross-Functional Leadership',
          description: 'Partnering with C-suite leaders and functional heads to drive alignment, lead transformation initiatives, and deliver sustainable growth.',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Cybersecurity Framework & Assessment Leadership',
          description: 'Guiding organizations through HITRUST certification (e1, i1, r2), SOC 2, and comprehensive risk management programs. Serves as a leader for the HITRUST User Group.',
          image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Process Design & Operational Efficiency',
          description: 'Building scalable, revenue-driven processes that accelerate pipelines, streamline workflows, and strengthen financial performance.',
          image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Legal Technology Optimization',
          description: 'Maximizing ROI from platforms including SmartAdvocate, HotDocs, Clio, Mighty/Justice Bolt, and e-signature systems through strategic implementation and adoption.',
          image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Sales Operations & Enablement',
          description: 'Elevating sales performance through clear metrics, optimized enablement tools, and refined go-to-market execution.',
          image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Financial Management & Forecasting',
          description: 'Strong command of financial operations — budgeting, forecasting, and investment modeling — to support data-driven decisions and profitability.',
          image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&auto=format&fit=crop&q=80'
        }
      ]
    },
    {
      name: 'Mark Nodson',
      title: 'Director of Technology',
      linkedIn: 'https://www.linkedin.com/in/mark-nodson-5546a662/',
      bio: 'Bio content coming soon.',
      expertise: []
    }
  ]);
}
