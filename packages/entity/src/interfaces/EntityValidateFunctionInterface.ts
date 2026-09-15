import type { EntityValidationErrorInterface } from './EntityValidationErrorInterface.js';

/** Validates unknown data and exposes the normalized diagnostics from its latest evaluation. */
export interface EntityValidateFunctionInterface<TValidated> {
  (data: unknown): data is TValidated;
  readonly 'errors'?: readonly EntityValidationErrorInterface[] | null;
}
