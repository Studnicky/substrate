/**
 * Abstract base class for all fetch-domain errors.
 * Every error thrown by `@studnicky/fetch` extends `FetchBaseError`.
 *
 * Inherits structured fields from `BaseError`:
 * - `code`          — dotted camelCase error code (e.g. `'fetch.timeout'`)
 * - `retryable`     — whether a retry may succeed
 * - `metadata`      — structured context dictionary
 * - `timestamp`     — Unix millisecond construction time
 * - `correlationId` — optional distributed-tracing identifier
 *
 * Every concrete subclass declares its `name` explicitly as a literal class member.
 */
import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/types/browser';

export abstract class FetchBaseError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
