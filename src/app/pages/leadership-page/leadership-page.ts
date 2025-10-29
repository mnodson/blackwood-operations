import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LeadershipComponent } from '../../components/leadership/leadership';

@Component({
  selector: 'app-leadership-page',
  templateUrl: './leadership-page.html',
  styleUrl: './leadership-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeadershipComponent]
})
export class LeadershipPage {}
