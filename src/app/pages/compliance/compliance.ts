import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollNavComponent, NavSection } from '../../components/scroll-nav/scroll-nav';
import { NcHeroComponent } from '../../components/compliance/nc-hero/nc-hero';
import { NcProblemComponent } from '../../components/compliance/nc-problem/nc-problem';
import { NcValueComponent } from '../../components/compliance/nc-value/nc-value';
import { NcAudienceComponent } from '../../components/compliance/nc-audience/nc-audience';
import { NcPricingComponent } from '../../components/compliance/nc-pricing/nc-pricing';
import { NcScopeComponent } from '../../components/compliance/nc-scope/nc-scope';
import { NcFaqComponent } from '../../components/compliance/nc-faq/nc-faq';
import { NcDisclaimerComponent } from '../../components/compliance/nc-disclaimer/nc-disclaimer';
import { NcStickyCtaComponent } from '../../components/compliance/nc-sticky-cta/nc-sticky-cta';

@Component({
  selector: 'app-compliance',
  templateUrl: './compliance.html',
  styleUrl: './compliance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ScrollNavComponent,
    NcHeroComponent,
    NcProblemComponent,
    NcValueComponent,
    NcAudienceComponent,
    NcPricingComponent,
    NcScopeComponent,
    NcFaqComponent,
    NcDisclaimerComponent,
    NcStickyCtaComponent
  ]
})
export class CompliancePage {
  protected readonly sections = signal<NavSection[]>([
    { id: 'what-you-get', label: 'What You Get' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'signup', label: 'Sign Up' },
    { id: 'the-problem', label: 'The Problem' },
    { id: 'notice-check', label: 'Free Notice Check' },
    { id: 'questions', label: 'Questions' }
  ]);
}
