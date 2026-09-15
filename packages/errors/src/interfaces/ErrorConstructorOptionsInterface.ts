/**
 * Shared optional construction parameters for domain-error leaf classes.
 *
 * @module
 */
import type { BaseErrorArgumentsInterface } from './BaseErrorArgumentsInterface.js';

/** Optional BaseError construction parameters supplied by a domain-error caller. */
export interface ErrorConstructorOptionsInterface extends Pick<
  BaseErrorArgumentsInterface,
  'cause' | 'correlationId' | 'metadata' | 'retryable'
> {}
