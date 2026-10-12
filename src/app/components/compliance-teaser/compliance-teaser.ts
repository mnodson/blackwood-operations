import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-compliance-teaser',
  templateUrl: './compliance-teaser.html',
  styleUrl: './compliance-teaser.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink]
})
export class ComplianceTeaserComponent {}
