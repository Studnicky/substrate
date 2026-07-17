/**
 * Concrete error for a duplicate concurrent `Channel.subscribe()` call.
 *
 * @module
 */
import { ConcurrencyError } from './ConcurrencyError.js';

/** Thrown when `subscribe()` is called for a key that already has an active subscriber. */
export class ChannelError extends ConcurrencyError {
  public readonly key: string;

  public constructor(key: string) {
    super({
      'code': 'concurrency.duplicateSubscriber',
      'message': `Channel.subscribe() called for key "${key}" while a subscriber is already active for that key.`,
      'retryable': false
    });
    this.key = key;
  }
}
