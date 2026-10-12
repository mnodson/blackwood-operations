import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { CheckoutError, CheckoutService, SignupRequest } from '../../shared/checkout';
import { NOTICE_ACCEPT, noticeFileProblem } from '../../shared/notice-file';
import { getControlError } from '../../shared/form-errors';
import { PLANS, Plan, PlanId, findPlan } from '../../shared/plans';
import { StateSelect } from '../../shared/state-select/state-select';

type SubmitState = 'idle' | 'submitting' | 'error';

interface Step {
  key: 'plan' | 'practice' | 'contact';
  label: string;
  title: string;
}

@Component({
  selector: 'app-compliance-signup',
  templateUrl: './compliance-signup.html',
  styleUrl: './compliance-signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, StateSelect]
})
export class ComplianceSignupPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly checkout = inject(CheckoutService);

  protected readonly plans = PLANS;

  protected readonly steps: Step[] = [
    { key: 'plan', label: 'Plan', title: 'Choose your plan' },
    { key: 'practice', label: 'Practice', title: 'Tell us about your practice' },
    { key: 'contact', label: 'Contact', title: 'Where should we send it?' }
  ];

  protected readonly practiceTypes = [
    'Medical and primary care',
    'Dental and orthodontic',
    'Counseling, therapy, and behavioral health',
    'Optometry and vision',
    'Physical, occupational, and speech therapy',
    'Chiropractic',
    'Home health and allied services',
    'Other'
  ];

  protected readonly stepIndex = signal(0);
  protected readonly submitState = signal<SubmitState>('idle');
  protected readonly submitError = signal<string | null>(null);
  protected readonly uploadedFile = signal<File | null>(null);
  protected readonly uploadedFileName = computed(() => this.uploadedFile()?.name ?? null);
  /** Why the chosen notice cannot be uploaded, shown under the field. */
  protected readonly fileError = signal<string | null>(null);
  protected readonly noticeAccept = NOTICE_ACCEPT;

  /** Stripe sends the visitor back here with ?canceled=1 if they leave checkout. */
  protected readonly returnedFromCheckout = signal(false);

  /** A promotion code from a ?promo= link, applied before Checkout opens. */
  private readonly promoCode = this.route.snapshot.queryParamMap.get('promo')?.trim() || undefined;

  /** Mirrors the plan control so the order summary can react to it. */
  protected readonly selectedPlanId = signal<PlanId | null>(null);

  protected readonly selectedPlan = computed<Plan | undefined>(() =>
    findPlan(this.selectedPlanId())
  );

  /** Optional monthly monitoring on top of the one-time update. */
  protected readonly monitoring = signal(false);

  /** The one-time update plus, with monitoring, its first month. */
  protected readonly dueToday = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return null;
    }
    return plan.price + (this.monitoring() ? plan.monitoringPrice : 0);
  });

  protected readonly currentStep = computed(() => this.steps[this.stepIndex()]);
  protected readonly isLastStep = computed(() => this.stepIndex() === this.steps.length - 1);

  protected readonly planGroup: FormGroup = this.fb.group({
    plan: ['', [Validators.required]]
  });

  protected readonly practiceGroup: FormGroup = this.fb.group({
    practiceName: ['', [Validators.required, Validators.minLength(2)]],
    practiceType: ['', [Validators.required]],
    practiceTypeOther: [''],
    locationCount: [null, [Validators.required, Validators.min(1)]],
    states: [[] as string[], [Validators.required]],
    hasNotice: ['', [Validators.required]]
  });

  private readonly practiceValue = toSignal(this.practiceGroup.valueChanges, {
    initialValue: this.practiceGroup.value
  });

  /** A soft nudge when the practice answers outgrow the chosen plan. Never blocks. */
  protected readonly planFitHint = computed(() => {
    const locations = Number(this.practiceValue().locationCount) || 0;
    const stateCount = (this.practiceValue().states as string[] | null)?.length ?? 0;

    switch (this.selectedPlanId()) {
      case 'essential':
        if (locations > 1 || stateCount > 1) {
          return 'Essential covers one location in one state. Practice covers up to five locations across multiple states.';
        }
        return null;
      case 'practice':
        if (locations > 5) {
          return 'Practice covers up to five locations. Group covers unlimited locations.';
        }
        return null;
      default:
        return null;
    }
  });

  protected readonly contactGroup: FormGroup = this.fb.group({
    contactName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]]
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;

    // A plan chosen on the pricing cards arrives as ?plan=practice.
    const plan = findPlan(params.get('plan'));

    if (plan) {
      this.choosePlan(plan.id);
    }

    // Returning from a canceled checkout keeps the monitoring choice.
    this.monitoring.set(params.get('monitoring') === '1');
    this.returnedFromCheckout.set(params.has('canceled'));
  }

  protected group(key: Step['key']): FormGroup {
    switch (key) {
      case 'plan':
        return this.planGroup;
      case 'practice':
        return this.practiceGroup;
      case 'contact':
        return this.contactGroup;
    }
  }

  protected choosePlan(id: PlanId): void {
    this.planGroup.patchValue({ plan: id });
    this.selectedPlanId.set(id);
  }

  protected isChosen(id: PlanId): boolean {
    return this.selectedPlanId() === id;
  }

  protected onMonitoringChange(event: Event): void {
    this.monitoring.set((event.target as HTMLInputElement).checked);
  }

  protected get isOtherPracticeType(): boolean {
    return this.practiceGroup.get('practiceType')?.value === 'Other';
  }

  /** Steps already completed stay clickable so a visitor can go back and change an answer. */
  protected isStepReachable(index: number): boolean {
    if (index <= this.stepIndex()) {
      return true;
    }

    return this.steps.slice(0, index).every(step => this.group(step.key).valid);
  }

  protected goToStep(index: number): void {
    if (!this.isStepReachable(index)) {
      return;
    }

    this.stepIndex.set(index);
    this.scrollToFormTop();
  }

  protected next(): void {
    const group = this.group(this.currentStep().key);

    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    this.stepIndex.update(index => Math.min(index + 1, this.steps.length - 1));
    this.scrollToFormTop();
  }

  protected back(): void {
    this.stepIndex.update(index => Math.max(index - 1, 0));
    this.scrollToFormTop();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const problem = file ? noticeFileProblem(file) : null;

    // A file that cannot be uploaded is cleared now, so it never blocks checkout.
    if (problem) {
      input.value = '';
    }
    this.fileError.set(problem);
    this.uploadedFile.set(problem ? null : file);
  }

  /**
   * Uploads the optional notice, asks the backend for a Stripe Checkout
   * Session, and hands the visitor to Stripe's hosted page. Card details are
   * never collected here.
   */
  protected async onSubmit(event: Event): Promise<void> {
    // The <form> has no Angular form directive of its own (each step binds its
    // own group), so stop the browser's native submit from reloading the page.
    event.preventDefault();

    // Enter in a field on an earlier step moves forward rather than submitting.
    if (!this.isLastStep()) {
      this.next();
      return;
    }

    const groups = this.steps.map(step => this.group(step.key));
    const firstInvalid = groups.findIndex(group => group.invalid);

    if (firstInvalid > -1) {
      groups[firstInvalid].markAllAsTouched();
      this.goToStep(firstInvalid);
      return;
    }

    if (this.submitState() === 'submitting') {
      return;
    }

    this.submitState.set('submitting');
    this.submitError.set(null);

    try {
      const file = this.uploadedFile();
      const noticeUploadPath = file ? await this.checkout.uploadNotice(file) : undefined;
      const session = await this.checkout.startCheckout(this.buildRequest(noticeUploadPath));

      // Full navigation: Stripe Checkout lives on stripe.com, not in the router.
      this.document.location.assign(session.url);
    } catch (error) {
      // A refused notice is cleared so the visitor can pick another or go without.
      if (error instanceof CheckoutError && error.field === 'notice') {
        this.clearNotice(error.message);
      }

      const message =
        error instanceof CheckoutError
          ? error.message
          : 'Something went wrong on our side. Please try again or email admin@blackwoodops.com.';

      this.submitError.set(message);
      this.submitState.set('error');
    }
  }

  private clearNotice(reason: string): void {
    const input = this.document.getElementById('notice-upload') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
    this.uploadedFile.set(null);
    this.fileError.set(reason);
  }

  private buildRequest(noticeUploadPath?: string): SignupRequest {
    const practice = this.practiceGroup.getRawValue();
    const contact = this.contactGroup.getRawValue();

    return {
      plan: this.planGroup.getRawValue().plan,
      monitoring: this.monitoring(),
      practice: {
        name: practice.practiceName,
        type: practice.practiceType,
        typeOther: practice.practiceType === 'Other' ? practice.practiceTypeOther : undefined,
        locationCount: Number(practice.locationCount),
        states: practice.states,
        hasNotice: practice.hasNotice
      },
      contact: {
        name: contact.contactName,
        email: contact.email,
        phone: contact.phone
      },
      noticeUploadPath,
      promoCode: this.promoCode
    };
  }

  protected error(key: Step['key'], fieldName: string): string | null {
    return getControlError(this.group(key).get(fieldName));
  }

  private scrollToFormTop(): void {
    const form = this.document.getElementById('signup-form');
    if (!form) {
      return;
    }

    const y = form.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}
