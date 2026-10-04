import { MutexError } from './MutexError.js';

/**
 * Abort reason for the timeout watcher of a queued acquisition.
 *
 * The watcher is cancelled with this reason once the acquisition has settled: the lock was
 * granted to the waiter, or the mutex was cleared.
 */
export class MutexAcquisitionSettledError<K extends PropertyKey> extends MutexError {
  public override readonly name: string = 'MutexAcquisitionSettledError';

  public readonly key: K;

  constructor(key: K) {
    super({
      'code': 'mutex.acquisitionSettled',
      'message': `Queued acquisition for key "${String(key)}" settled; its timeout watcher is cancelled.`,
      'retryable': false
    });
    this.key = key;
  }
}
