/**
 * Composes caller cancellation and deadline sources into one AbortSignal.
 */
export interface SignalInterface {
  compose(options: { readonly 'deadlineMs'?: number; readonly 'signal'?: AbortSignal; }): Promise<AbortSignal>;
}
