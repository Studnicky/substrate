import type { ComposedSignalInterface } from './ComposedSignalInterface.js';
import type { SignalComposeOptionsInterface } from './SignalComposeOptionsInterface.js';

/**
 * Composes caller cancellation and deadline sources into one disposable signal.
 */
export interface SignalInterface {
  compose(options: SignalComposeOptionsInterface): Promise<ComposedSignalInterface>;
}
