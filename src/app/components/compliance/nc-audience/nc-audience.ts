import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface PracticeType {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-nc-audience',
  templateUrl: './nc-audience.html',
  styleUrl: './nc-audience.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NcAudienceComponent {
  protected readonly practiceTypes = signal<PracticeType[]>([
    { icon: 'stethoscope', label: 'Medical and primary care' },
    { icon: 'dentistry', label: 'Dental and orthodontic' },
    { icon: 'psychology', label: 'Counseling, therapy, and behavioral health' },
    { icon: 'visibility', label: 'Optometry and vision' },
    { icon: 'exercise', label: 'Physical, occupational, and speech therapy' },
    { icon: 'accessibility_new', label: 'Chiropractic' },
    { icon: 'home_health', label: 'Home health and allied services' }
  ]);
}
