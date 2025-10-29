import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

interface Service {
  title: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-services',
  templateUrl: './services.html',
  styleUrl: './services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage]
})
export class ServicesComponent {
  protected readonly services = signal<Service[]>([
    {
      title: 'Process Design',
      description: 'Streamline operations with scalable, efficient processes tailored to your business needs.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Compliance & Risk Management',
      description: 'Navigate regulatory requirements and mitigate risks with expert guidance and implementation.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Technology Integration',
      description: 'Optimize your tech stack and workflows to drive efficiency and support growth.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Fractional COO Services',
      description: 'Access senior operational leadership on-demand, without the full-time commitment.',
      image: 'https://images.unsplash.com/photo-1614786269829-d24616faf56d?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Strategic Advisory',
      description: 'Develop go-to-market strategies, refine business models, and secure funding with expert support.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Project Management',
      description: 'Establish lean PMOs, align cross-functional teams, and deliver results on time.',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80'
    }
  ]);
}
