import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BILLING_PORTAL_URL } from '../../../shared/billing';
import { PLANS } from '../../../shared/plans';

@Component({
  selector: 'app-nc-pricing',
  templateUrl: './nc-pricing.html',
  styleUrl: './nc-pricing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink]
})
export class NcPricingComponent {
  protected readonly plans = PLANS;
  protected readonly billingPortalUrl = BILLING_PORTAL_URL;
}
