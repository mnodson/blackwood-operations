import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroComponent } from '../../components/hero/hero';
import { AboutComponent } from '../../components/about/about';
import { StatsComponent } from '../../components/stats/stats';
import { ServicesComponent } from '../../components/services/services';
import { CaseStudiesComponent } from '../../components/case-studies/case-studies';
import { TestimonialsComponent } from '../../components/testimonials/testimonials';
import { CtaComponent } from '../../components/cta/cta';

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
    TestimonialsComponent,
    CtaComponent
  ]
})
export class HomePage {}
