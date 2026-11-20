import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Mensaje de error bajo un campo (del front o de la validación del back). */
@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (message()) {
    <span class="field-error" role="alert">{{ message() }}</span>
  }`,
})
export class FieldError {
  readonly message = input<string | null | undefined>(null);
}
