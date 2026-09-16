import type { SemaphoreAcquireOptionsInterface } from '@studnicky/concurrency/interfaces';

/** Runtime data available to policies surrounding one dispatch invocation. */
export interface BoundedDispatcherOperationContextInterface {
  /** Semaphore options applied when this dispatch attempts admission. */
  readonly 'semaphoreOptions': SemaphoreAcquireOptionsInterface;
}
