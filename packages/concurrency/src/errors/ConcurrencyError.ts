import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';
/**
 * Abstract base error for the `@studnicky/concurrency` package.
 *
 * @module
 */

/** Abstract base for all concurrency-domain errors. */
export abstract class ConcurrencyError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
