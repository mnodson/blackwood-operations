import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CalendlyWidgetComponent } from '../../components/calendly-widget/calendly-widget';
import { AssessmentResultState } from '../../models/assessment-result-state.interface';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CalendlyWidgetComponent]
})
export class ContactPage {
  protected readonly contactForm: FormGroup;
  protected readonly isSubmitting = signal(false);
  protected readonly submitSuccess = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly assessmentResult = signal<AssessmentResultState | null>(null);

  protected readonly mailtoHref = computed(() => {
    const result = this.assessmentResult();
    if (!result) return 'mailto:donna@blackwoodops.com';

    const subject = encodeURIComponent(`Operational Assessment Results - ${result.title}`);

    let body = `Hi Donna,

I completed the Operational Health Assessment and would like to discuss my results.

ASSESSMENT RESULTS
==================
Score: ${result.scorePercentage}%
Level: ${result.title}
${result.summary}

QUESTION RESPONSES
==================`;

    result.responses.forEach((response, index) => {
      body += `
${index + 1}. ${response.category}: ${response.question}
   Answer: ${response.selectedAnswer}`;
    });

    body += `

RECOMMENDATIONS
===============`;
    result.recommendations.forEach((rec, index) => {
      body += `
${index + 1}. ${rec}`;
    });

    body += `

Looking forward to discussing how Blackwood Operations can help.`;

    return `mailto:donna@blackwoodops.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  });

  protected readonly calendlyPrefill = computed(() => {
    const result = this.assessmentResult();
    if (!result) return {};

    const summary = `Assessment Score: ${result.scorePercentage}% (${result.title}). ${result.summary}`;

    return {
      customAnswers: {
        a1: summary
      }
    };
  });

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      company: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });

    // Extract assessment result from router state
    const state = history.state?.assessmentResult as AssessmentResultState | undefined;
    if (state) {
      this.assessmentResult.set(state);
    }
  }

  protected onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    // Simulate form submission
    // In production, this would call an API service
    setTimeout(() => {
      console.log('Form submitted:', this.contactForm.value);
      this.isSubmitting.set(false);
      this.submitSuccess.set(true);
      this.contactForm.reset();

      // Reset success message after 5 seconds
      setTimeout(() => {
        this.submitSuccess.set(false);
      }, 5000);
    }, 1000);
  }

  protected getFieldError(fieldName: string): string | null {
    const field = this.contactForm.get(fieldName);
    if (!field || !field.touched || !field.errors) {
      return null;
    }

    if (field.errors['required']) {
      return 'This field is required';
    }
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `Must be at least ${minLength} characters`;
    }
    return null;
  }

  protected openCalendly(): void {
    window.open('https://calendly.com/donna-nodson/30min', '_blank');
  }
}
