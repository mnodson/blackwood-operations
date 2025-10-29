import { Component, ChangeDetectionStrategy, OnInit, ElementRef, ViewChild, input } from '@angular/core';

declare global {
  interface Window {
    Calendly: any;
  }
}

@Component({
  selector: 'app-calendly-widget',
  templateUrl: './calendly-widget.html',
  styleUrl: './calendly-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendlyWidgetComponent implements OnInit {
  @ViewChild('calendlyContainer', { static: true }) calendlyContainer!: ElementRef;

  readonly url = input<string>('https://calendly.com/blackwoodops');
  readonly minHeight = input<string>('630px');

  ngOnInit(): void {
    this.initializeCalendly();
  }

  private initializeCalendly(): void {
    if (typeof window !== 'undefined' && window.Calendly) {
      window.Calendly.initInlineWidget({
        url: this.url(),
        parentElement: this.calendlyContainer.nativeElement,
        prefill: {},
        utm: {}
      });
    } else {
      // If Calendly script hasn't loaded yet, wait and retry
      setTimeout(() => this.initializeCalendly(), 100);
    }
  }
}
