import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NcChangedComponent } from '../../components/compliance/nc-changed/nc-changed';
import { NcDisclaimerComponent } from '../../components/compliance/nc-disclaimer/nc-disclaimer';

@Component({
  selector: 'app-privacy-changes',
  templateUrl: './privacy-changes.html',
  styleUrl: './privacy-changes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NcChangedComponent, NcDisclaimerComponent]
})
export class PrivacyChangesPage {}
