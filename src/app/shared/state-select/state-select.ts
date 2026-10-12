import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { US_STATES } from '../us-states';

/**
 * Searchable multi-select of US states for reactive forms. The control value
 * is an array of two-letter codes in list order.
 */
@Component({
  selector: 'app-state-select',
  templateUrl: './state-select.html',
  styleUrl: './state-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StateSelect), multi: true }
  ],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()'
  }
})
export class StateSelect implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Id for the trigger button, so an outside `<label for>` points at it. */
  readonly inputId = input.required<string>();

  protected readonly isOpen = signal(false);
  protected readonly isDisabled = signal(false);
  protected readonly query = signal('');
  protected readonly selected = signal<string[]>([]);

  protected readonly options = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return US_STATES;
    }
    return US_STATES.filter(
      state => state.name.toLowerCase().includes(query) || state.code.toLowerCase() === query
    );
  });

  protected readonly selectedStates = computed(() => {
    const codes = new Set(this.selected());
    return US_STATES.filter(state => codes.has(state.code));
  });

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.selected.set(Array.isArray(value) ? value : []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected isSelected(code: string): boolean {
    return this.selected().includes(code);
  }

  protected toggle(code: string): void {
    const codes = new Set(this.selected());
    if (codes.has(code)) {
      codes.delete(code);
    } else {
      codes.add(code);
    }
    // Keep list order so the value is stable regardless of click order.
    this.emit(US_STATES.filter(state => codes.has(state.code)).map(state => state.code));
  }

  protected remove(code: string): void {
    this.emit(this.selected().filter(selected => selected !== code));
  }

  protected toggleOpen(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.isOpen.set(true);
    }
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.query.set('');
    this.onTouched();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private emit(codes: string[]): void {
    this.selected.set(codes);
    this.onChange(codes);
  }
}
