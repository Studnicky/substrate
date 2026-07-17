/** Fluent builder for assembling a {@link ValidationErrors} instance incrementally. */

import type { ValidationViolationEntity } from '../entities/ValidationViolationEntity.js';
import type { ValidationErrors } from './ValidationErrors.js';

/**
 * Fluent builder for assembling a `ValidationErrors` instance incrementally.
 *
 * Obtain via `ValidationErrors.builder()`.
 */
export class ValidationErrorsBuilder {
  /** Creates a new builder wired to the provided factory function. */
  public static create(
    create: (items: readonly ValidationViolationEntity.Type[]) => ValidationErrors
  ): ValidationErrorsBuilder {
    const result = new ValidationErrorsBuilder(create);
    return result;
  }

  readonly #create: (items: readonly ValidationViolationEntity.Type[]) => ValidationErrors;
  readonly #items: ValidationViolationEntity.Type[] = [];

  private constructor(create: (items: readonly ValidationViolationEntity.Type[]) => ValidationErrors) {
    this.#create = create;
  }

  /** Appends a violation to the builder. Returns `this` for chaining. */
  public addViolation(v: ValidationViolationEntity.Type): this {
    this.#items.push(v);
    return this;
  }

  /** Builds and returns the `ValidationErrors` from accumulated violations. */
  public build(): ValidationErrors {
    const result = this.#create([...this.#items]);
    return result;
  }
}
