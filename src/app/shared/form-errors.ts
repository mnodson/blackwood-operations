import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Maps the validation errors on a touched control to a single human-readable
 * message. Shared so form components do not each carry their own copy.
 */
export function getControlError(control: AbstractControl | null): string | null {
  if (!control || !control.touched || !control.errors) {
    return null;
  }

  const errors = control.errors;

  if (errors['required']) {
    return 'This field is required';
  }
  if (errors['email']) {
    return 'Please enter a valid email address';
  }
  if (errors['minlength']) {
    return `Must be at least ${errors['minlength'].requiredLength} characters`;
  }
  if (errors['maxlength']) {
    return `Must be no more than ${errors['maxlength'].requiredLength} characters`;
  }
  if (errors['min']) {
    return `Must be at least ${errors['min'].min}`;
  }
  if (errors['max']) {
    return `Must be no more than ${errors['max'].max}`;
  }
  if (errors['pattern']) {
    return 'Please check the format of this field';
  }

  return null;
}

/** Convenience wrapper for the common `form.get(name)` case. */
export function getFieldError(form: FormGroup, fieldName: string): string | null {
  return getControlError(form.get(fieldName));
}
