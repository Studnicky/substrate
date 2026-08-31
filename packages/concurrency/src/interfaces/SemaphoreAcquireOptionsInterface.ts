/** Cancellation source for a waiting semaphore acquisition. */
export interface SemaphoreAcquireOptionsInterface {
  readonly 'signal'?: AbortSignal;
}
