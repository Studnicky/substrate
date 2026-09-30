/** Composes AbortSignal sources; eliminates repeated AbortController boilerplate. */
import { HookInvoker } from '@studnicky/errors/browser';
import { Predicates } from '@studnicky/types/browser';

import type { ComposedSignalInterface } from './interfaces/ComposedSignalInterface.js';
import type { DeadlineTimerInterface } from './interfaces/DeadlineTimerInterface.js';
import type { SignalComposeOptionsInterface } from './interfaces/SignalComposeOptionsInterface.js';

import { SignalError } from './errors/SignalError.js';
import { SignalTimeoutError } from './errors/SignalTimeoutError.js';
import { RealDeadlineTimer } from './RealDeadlineTimer.js';

interface SignalResolveOptionsInterface {
  readonly 'callerSignal': AbortSignal | undefined;
  readonly 'timeoutSignal': AbortSignal | undefined;
}

class ComposedSignal implements ComposedSignalInterface {
  #disposed = false;

  constructor(
    public readonly signal: AbortSignal,
    private readonly timeoutDispose: (() => void) | undefined
  ) {
    if (this.timeoutDispose !== undefined) {
      this.signal.addEventListener('abort', this.#onAbort, { 'once': true });
    }
    if (this.signal.aborted) {
      this.dispose();
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.timeoutDispose?.();
    this.signal.removeEventListener('abort', this.#onAbort);
  }

  #onAbort = (): void => {
    this.dispose();
  };
}
export class Signal {
  protected readonly hooks: HookInvoker;

  protected constructor(hooks: HookInvoker = new HookInvoker()) {
    this.hooks = hooks;
  }

  static create(): Signal {
    return new Signal();
  }

  static never(): AbortSignal {
    const controller = new AbortController();
    return controller.signal;
  }

  async compose(options: SignalComposeOptionsInterface): Promise<ComposedSignalInterface> {
    Signal.#validateDeadline(options.deadlineMs);

    const timeoutResult = options.deadlineMs !== undefined
      ? Signal.#createTimeoutSignal(options.deadlineMs, options.timer ?? RealDeadlineTimer.create())
      : undefined;
    const result = Signal.#resolveSignal({
      'callerSignal': options.signal,
      'timeoutSignal': timeoutResult?.signal
    });
    const composed = new ComposedSignal(result, timeoutResult?.dispose);

    let hookFailed = true;

    try {
      await this.hooks.invokeAsync('onCompose', async () => {
        const hookResult = this.onCompose(options, composed.signal);

        await hookResult;
      });
      hookFailed = false;
    } finally {
      if (hookFailed) {
        composed.dispose();
      }
    }

    return composed;
  }

  static #validateDeadline(deadlineMs: number | undefined): void {
    if (deadlineMs !== undefined && (!Predicates.isFiniteNumber(deadlineMs) || !Number.isInteger(deadlineMs) || deadlineMs < 0 || deadlineMs > 2_147_483_647)) {
      throw new SignalError('deadlineMs must be an integer between 0 and 2147483647');
    }
  }

  /** Builds an AbortSignal that aborts once `timer` fires at `timer.now() + deadlineMs`. */
  static #createTimeoutSignal(deadlineMs: number, timer: DeadlineTimerInterface): { 'dispose': () => void; 'signal': AbortSignal } {
    const controller = new AbortController();
    let fired = false;
    const handle = timer.scheduleAt(timer.now() + deadlineMs, () => {
      fired = true;
      controller.abort(new SignalTimeoutError(deadlineMs));
    });
    return {
      'dispose': () => {
        if (!fired) {
          fired = true;
          handle.cancel();
        }
      },
      'signal': controller.signal
    };
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
  protected onCompose(_options: SignalComposeOptionsInterface, _result: AbortSignal): void | Promise<void> {}
}
