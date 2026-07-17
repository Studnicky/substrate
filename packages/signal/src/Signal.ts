/** Composes AbortSignal sources; eliminates repeated AbortController boilerplate. */

import { HookInvoker } from '@studnicky/errors';

import { SignalError } from './errors/SignalError.js';

export class Signal {
  static #never: AbortSignal | null = null;
  static #default: Signal | null = null;

  protected readonly hooks: HookInvoker;

  protected constructor(hooks: HookInvoker = new HookInvoker()) {
    this.hooks = hooks;
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

  static async compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): Promise<AbortSignal> {
    const result = await Signal.#defaultInstance().compose(options);
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

  async compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): Promise<AbortSignal> {
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

    await this.hooks.invoke('onCompose', () => {
      const hookResult = this.onCompose(options, result);
      return hookResult;
    });
    return result;
  }

  timeout(ms: number): AbortSignal {
    const result = AbortSignal.timeout(ms);
    const hookResult = this.hooks.invoke('onTimeout', () => {
      const value = this.onTimeout(ms, result);
      return value;
    });
    if (hookResult instanceof Promise) {
      // timeout() is deliberately synchronous — an async onTimeout override's
      // rejection is already routed through HookInvoker's own internal
      // safety net (see HookInvoker#guardResult), so this is purely to
      // satisfy static floating-promise analysis at this call site.
      hookResult.catch(() => {});
    }
    return result;
  }

  /** Fires synchronously after `compose()` computes its result, right before returning it. No-op by default. */
  protected onCompose(_options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }, _result: AbortSignal): void | Promise<void> {}

  /** Fires synchronously after `timeout()` computes its result, right before returning it. No-op by default. */
  protected onTimeout(_ms: number, _result: AbortSignal): void | Promise<void> {}
}
