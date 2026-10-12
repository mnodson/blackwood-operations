import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface FaqEntry {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-nc-faq',
  templateUrl: './nc-faq.html',
  styleUrl: './nc-faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NcFaqComponent {
  protected readonly openIndex = signal<number | null>(0);

  protected readonly entries = signal<FaqEntry[]>([
    {
      question: 'Do I really have to update my notice?',
      answer:
        'If you are a HIPAA covered entity, 45 CFR 164.520 requires you to maintain a notice, make ' +
        'it available, and revise it when there is a material change to your privacy practices or ' +
        'legal obligations. The February 2026 Part 2 deadline applied to covered entities well ' +
        'beyond substance use programs.'
    },
    {
      question: 'My association gave me a template. Is that enough?',
      answer:
        'A template gets you a starting point. It does not account for your state’s requirements, ' +
        'your practice’s actual information flows, or changes that happen after you downloaded it. ' +
        'Templates also do not know when they have expired.'
    },
    {
      question: 'Do I have to subscribe?',
      answer:
        'No. The update is a one-time purchase and the documents are yours to keep. Monitoring is ' +
        'an optional monthly add-on you choose when you buy your update.'
    },
    {
      question: 'What if my state passes something new?',
      answer:
        'That is what monitoring is for. If you have it and a change affects your notice, you get ' +
        'a revision and an explanation.'
    },
    {
      question: 'Can my attorney review this?',
      answer:
        'Yes, and we recommend it. We deliver a document your counsel can review efficiently, with ' +
        'the reasoning behind each change documented.'
    },
    {
      question: 'How fast do I get my first notice?',
      answer: 'Within five business days of receiving your practice details.'
    },
    {
      question: 'What happens if I cancel monitoring?',
      answer:
        'You keep the most recent notice we issued. Monitoring stops, so future changes are yours ' +
        'to track.'
    }
  ]);

  protected toggle(index: number): void {
    this.openIndex.update(current => (current === index ? null : index));
  }

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }
}
