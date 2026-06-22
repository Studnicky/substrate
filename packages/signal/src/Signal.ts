/** Composes AbortSignal sources; eliminates repeated AbortController boilerplate. */

export class Signal {
  static #never: AbortSignal | null = null;

  private constructor() {}

  static never(): AbortSignal {
    if (Signal.#never === null) {
      Signal.#never = new AbortController().signal;
    }
    return Signal.#never;
  }

  static compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): AbortSignal {
    const callerSignal  = options.signal;
    const deadlineMs    = options.deadlineMs;
    const timeoutSignal = deadlineMs !== undefined ? AbortSignal.timeout(deadlineMs) : undefined;

    if (callerSignal !== undefined && timeoutSignal !== undefined) {
      return AbortSignal.any([callerSignal, timeoutSignal]);
    }
    if (callerSignal !== undefined) return callerSignal;
    if (timeoutSignal !== undefined) return timeoutSignal;
    // When neither supplied, return the never-aborting sentinel
    return Signal.never();
  }

  static timeout(ms: number): AbortSignal {
    return AbortSignal.timeout(ms);
  }
}
