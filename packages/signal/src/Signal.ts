/** Composes AbortSignal sources; eliminates repeated AbortController boilerplate. */

import { HookInvoker } from '@studnicky/errors';

import { SignalError } from './errors/SignalError.js';

class SignalInstance {
  static construct(constructor: Function): object {
    const result: unknown = Reflect.construct(constructor, []);
    if (typeof result !== 'object' || result === null) {
      throw new TypeError('Signal.create() did not construct an object.');
    }
    return result;
  }

  static belongsTo<TInstance extends object>(constructor: Function, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class Signal {
  static #never: AbortSignal | null = null;

  protected readonly hooks: HookInvoker;

  protected constructor(hooks: HookInvoker = new HookInvoker()) {
    this.hooks = hooks;
  }

  static create<TInstance extends Signal = Signal>(this: Function & { readonly 'prototype': TInstance; }): TInstance {
    const result = SignalInstance.construct(this);
    if (!SignalInstance.belongsTo<TInstance>(this, result)) {
      throw new TypeError('Signal.create() did not construct the requested subclass.');
    }
    return result;
  }

  static never(): AbortSignal {
    if (Signal.#never === null) {
      Signal.#never = new AbortController().signal;
    }

    return Signal.#never;
  }

  async compose(options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }): Promise<AbortSignal> {
    const callerSignal = options.signal;
    const deadlineMs = options.deadlineMs;

    if (deadlineMs !== undefined && (typeof deadlineMs !== 'number' || isNaN(deadlineMs) || deadlineMs < 0)) {
      throw new SignalError('deadlineMs must be a non-negative number');
    }

    const timeoutSignal = deadlineMs !== undefined ? AbortSignal.timeout(deadlineMs) : undefined;

    let result: AbortSignal;

    if (callerSignal !== undefined && timeoutSignal !== undefined) {
      result = AbortSignal.any([
        callerSignal,
        timeoutSignal
      ]);
    } else if (callerSignal !== undefined) {
      result = callerSignal;
    } else if (timeoutSignal !== undefined) {
      result = timeoutSignal;
    } else {
      // When neither supplied, return the never-aborting sentinel
      result = Signal.never();
    }

    await this.hooks.invokeAsync('onCompose', async () => {
      const hookResult = this.onCompose(options, result);

      await hookResult;
    });

    return result;
  }

  /** Fires synchronously after `compose()` computes its result, right before returning it. No-op by default. */
  protected onCompose(_options: { 'deadlineMs'?: number; 'signal'?: AbortSignal; }, _result: AbortSignal): void | Promise<void> {}
}
