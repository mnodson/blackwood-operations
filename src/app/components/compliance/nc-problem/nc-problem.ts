import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nc-problem',
  templateUrl: './nc-problem.html',
  styleUrl: './nc-problem.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink]
})
export class NcProblemComponent {
  protected readonly failures = signal<string[]>([
    'The template came from a professional association, a billing vendor, or a search result. It was accurate the year it was downloaded.',
    'Nobody owns it. The practice manager assumes the attorney handles it. The attorney assumes it was handled at intake.',
    'It only gets attention after something has already gone wrong.'
  ]);
}
