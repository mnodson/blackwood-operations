import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface Benefit {
  icon: string;
  heading: string;
  body: string;
}

interface NoticeType {
  label: string;
  body: string;
}

interface Step {
  heading: string;
  body: string;
}

@Component({
  selector: 'app-nc-value',
  templateUrl: './nc-value.html',
  styleUrl: './nc-value.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NcValueComponent {
  protected readonly benefits = signal<Benefit[]>([
    {
      icon: 'edit_document',
      heading: 'A notice written for your practice, not a template with your name in the header.',
      body:
        'Medical, dental, counseling and behavioral health, optometry, physical therapy, ' +
        'chiropractic, and allied practices each face a different mix of requirements. A ' +
        'counseling practice has Part 2 exposure a general optometry practice usually does not. ' +
        'Your notice should reflect that.'
    },
    {
      icon: 'radar',
      heading: 'Monitoring at the federal, state, and local level, if you want it.',
      body:
        'Add monitoring and we track HHS and OCR rulemaking, court decisions affecting existing ' +
        'rules, and state health privacy legislation in the states where you practice. You do not ' +
        'have to read the Federal Register.'
    },
    {
      icon: 'event_repeat',
      heading: 'Updated documents whenever something material changes.',
      body:
        'With monitoring, a rule change that affects your notice means a revised document when it ' +
        'happens, not when someone next remembers to check.'
    },
    {
      icon: 'file_copy',
      heading: 'Every format you actually need.',
      body:
        'Posted lobby version. Website version. Patient handout. Plain-language summary. Effective ' +
        'dates and version history maintained, so you can show what was in force and when.'
    },
    {
      icon: 'sticky_note_2',
      heading: 'A short note explaining what changed and why.',
      body:
        'Written for a practice manager, not a compliance officer. If a change requires action ' +
        'beyond the notice itself, such as updating an intake form or a business associate ' +
        'agreement, we say so.'
    }
  ]);

  /** Shown inside the lead benefit to help visitors pick the right notice. */
  protected readonly noticeTypes = signal<NoticeType[]>([
    {
      label: 'HIPAA Notice of Privacy Practices.',
      body: 'Medical, dental, behavioral health, and other practices covered by HIPAA.'
    },
    {
      label: 'State privacy notices.',
      body:
        'Organizations that hold health or personal information outside HIPAA, such as law ' +
        'firms, schools, insurers, and fitness and wellness providers.'
    },
    {
      label: 'Both.',
      body:
        'Practices in states with their own health privacy laws, like Texas, and organizations ' +
        'operating across several states.'
    },
    {
      label: 'Not sure?',
      body: 'Send us what you have. Our free Notice Check tells you which apply to you.'
    }
  ]);

  protected readonly steps = signal<Step[]>([
    {
      heading: 'Sign up.',
      body:
        'Choose your plan, tell us your practice type, your states, and your locations. Five minutes.'
    },
    {
      heading: 'We review what you have.',
      body:
        'Send us your current notice. We tell you exactly where it stands against today’s requirements.'
    },
    {
      heading: 'You get your notice.',
      body:
        'Drafted for your practice, delivered in every format, ready for your counsel to review and ' +
        'for you to post.'
    },
    {
      heading: 'We keep watch.',
      body:
        'Add monitoring and it runs continuously. Updated documents arrive whenever they are ' +
        'required.'
    }
  ]);
}
