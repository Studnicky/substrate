import type { SignalComposeOptionsInterface } from './SignalComposeOptionsInterface.js';

/**
 * Composes caller cancellation and deadline sources into one AbortSignal.
 */
export interface SignalInterface {
  compose(options: SignalComposeOptionsInterface): Promise<AbortSignal>;
}
