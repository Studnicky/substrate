/** Composes AbortSignal sources; eliminates repeated AbortController boilerplate. */

import { SignalError } from './errors/SignalError.js';

export class Signal {
  static #never: AbortSignal | null = null;
  static #default: Signal | null = null;

  protected constructor() {}

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  static create(): Signal {
    return new Signal();
  }

  static never(): AbortSignal {
    if (Signal.#never === null) {
      Signal.#never = new AbortController().signal;
    }
    return Signal.#never;
  }

  static compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): AbortSignal {
    const result = Signal.#defaultInstance().compose(options);
    return result;
  }

  static timeout(ms: number): AbortSignal {
    const result = Signal.#defaultInstance().timeout(ms);
    return result;
  }

  static #defaultInstance(): Signal {
    if (Signal.#default === null) {
      Signal.#default = Signal.create();
    }
    return Signal.#default;
  }

  compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): AbortSignal {
    const callerSignal  = options.signal;
    const deadlineMs    = options.deadlineMs;

    if (deadlineMs !== undefined && (typeof deadlineMs !== 'number' || isNaN(deadlineMs) || deadlineMs < 0)) {
      throw new SignalError('deadlineMs must be a non-negative number');
    }

    const timeoutSignal = deadlineMs !== undefined ? AbortSignal.timeout(deadlineMs) : undefined;

    let result: AbortSignal;
    if (callerSignal !== undefined && timeoutSignal !== undefined) {
      result = AbortSignal.any([callerSignal, timeoutSignal]);
    } else if (callerSignal !== undefined) {
      result = callerSignal;
    } else if (timeoutSignal !== undefined) {
      result = timeoutSignal;
    } else {
      // When neither supplied, return the never-aborting sentinel
      result = Signal.never();
    }

    this.#invokeHook(() => {
      this.onCompose(options, result);
    });
    return result;
  }

  timeout(ms: number): AbortSignal {
    const result = AbortSignal.timeout(ms);
    return result;
  }

  /** Fires synchronously after `compose()` computes its result, right before returning it. No-op by default. */
  protected onCompose(_options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }, _result: AbortSignal): void {}
}
