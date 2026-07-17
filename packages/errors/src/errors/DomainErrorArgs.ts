/**
 * Collapses the repeated "compute `code`/`message`/`retryable`, hand it to
 * `super()`" ceremony that domain error leaf classes duplicate across the
 * monorepo into a single call.
 *
 * @module
 */
import { PickDefined } from '@studnicky/types';

import type { BaseErrorArgumentsType } from '../types/BaseErrorArgumentsType.js';
import type { DomainErrorOptionsType } from '../types/DomainErrorOptionsType.js';

/** Builds `BaseErrorArgumentsType` values for domain error `super()` calls. */
export class DomainErrorArgs {
  /**
   * Builds a `BaseErrorArgumentsType` for `super()` from typed fields and a
   * `{ code, message, retryable, ... }` options object.
   *
   * Field assignment is left to the caller — `Object.assign(this, fields)`
   * right after `super()` — since `this` is unavailable before `super()` runs.
   */
  public static build<TFields extends Record<string, unknown>>(
    fields: Readonly<TFields>,
    options: Readonly<DomainErrorOptionsType<TFields>>
  ): BaseErrorArgumentsType {
    return {
      'code': options.code,
      'message': options.message(fields),
      ...PickDefined.from({
        'cause': options.cause,
        'correlationId': options.correlationId,
        'metadata': options.metadata,
        'retryable': options.retryable
      })
    };
  }
}
