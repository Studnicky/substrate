/** Composes AbortSignal sources; eliminates repeated AbortController boilerplate. */
import { HookInvoker, RuntimeError } from '@studnicky/errors/browser';
import { Predicates } from '@studnicky/types/browser';

import { SignalError } from './errors/SignalError.js';

interface SignalResolveOptionsInterface {
  readonly 'callerSignal': AbortSignal | undefined;
  readonly 'timeoutSignal': AbortSignal | undefined;
}

class SignalInstance {
  static construct(constructor: Function): object {
    const result: unknown = Reflect.construct(constructor, []);
    if (!Predicates.isObjectLike(result)) {
      throw RuntimeError.create('Signal.create() did not construct an object.');
    }
    return result;
  }

}

export class Signal {
  protected readonly hooks: HookInvoker;

  protected constructor(hooks: HookInvoker = new HookInvoker()) {
    this.hooks = hooks;
  }

  static create<TInstance extends Signal = Signal>(this: Function & { readonly 'prototype': TInstance; }): TInstance {
    const result = SignalInstance.construct(this);
    if (!Predicates.isInstanceOf<TInstance>(result, this)) {
      throw RuntimeError.create('Signal.create() did not construct the requested subclass.');
    }
    return result;
  }

  static never(): AbortSignal {
    const controller = new AbortController();
    return controller.signal;
  }

  async compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): Promise<AbortSignal> {
    Signal.#validateDeadline(options.deadlineMs);

    const timeoutSignal = options.deadlineMs !== undefined ? AbortSignal.timeout(options.deadlineMs) : undefined;
    const result = Signal.#resolveSignal({ 'callerSignal': options.signal, 'timeoutSignal': timeoutSignal });

    await this.hooks.invokeAsync('onCompose', async () => {
      const hookResult = this.onCompose(options, result);

      await hookResult;
    });

    return result;
  }

  static #validateDeadline(deadlineMs: number | undefined): void {
    if (deadlineMs !== undefined && (!Predicates.isFiniteNumber(deadlineMs) || !Number.isInteger(deadlineMs) || deadlineMs < 0 || deadlineMs > 2_147_483_647)) {
      throw new SignalError('deadlineMs must be an integer between 0 and 2147483647');
    }
  }

  /** Prefers the caller signal combined with the deadline timeout; falls back to whichever is supplied, then the never-aborting sentinel. */
  static #resolveSignal(options: SignalResolveOptionsInterface): AbortSignal {
    const { callerSignal, timeoutSignal } = options;
    if (callerSignal !== undefined && timeoutSignal !== undefined) {
      const result = AbortSignal.any([
        callerSignal,
        timeoutSignal
      ]);
      return result;
    }
    if (callerSignal !== undefined) {
      return callerSignal;
    }
    if (timeoutSignal !== undefined) {
      return timeoutSignal;
    }
    const result = Signal.never();
    return result;
  }

  /** Fires synchronously after `compose()` computes its result, right before returning it. No-op by default. */
  protected onCompose(_options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }, _result: AbortSignal): void | Promise<void> {}
}
