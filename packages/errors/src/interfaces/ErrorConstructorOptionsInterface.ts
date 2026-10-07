import type { BaseErrorArgumentsInterface } from '#runtime';
/**
 * Shared optional construction parameters for domain-error leaf classes.
 *
 * @module
 */

/** Optional BaseError construction parameters supplied by a domain-error caller. */
export interface ErrorConstructorOptionsInterface extends Pick<
  BaseErrorArgumentsInterface,
  'cause' | 'correlationId' | 'metadata' | 'retryable'
> {}
