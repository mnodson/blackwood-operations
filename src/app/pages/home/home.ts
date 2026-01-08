import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroComponent } from '../../components/hero/hero';
import { AboutComponent } from '../../components/about/about';
import { StatsComponent } from '../../components/stats/stats';
import { ServicesComponent } from '../../components/services/services';
import { CaseStudiesComponent } from '../../components/case-studies/case-studies';
import { AssessmentComponent } from '../../components/assessment/assessment';
import { TestimonialsComponent } from '../../components/testimonials/testimonials';
import { CtaComponent } from '../../components/cta/cta';
import { ScrollNavComponent } from '../../components/scroll-nav/scroll-nav';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroComponent,
    AboutComponent,
    StatsComponent,
    ServicesComponent,
    CaseStudiesComponent,
    AssessmentComponent,
    TestimonialsComponent,
    CtaComponent,
    ScrollNavComponent
  ]
})
export class HomePage {}
