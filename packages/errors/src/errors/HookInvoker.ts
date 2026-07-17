/**
 * Composable invoker for consumer-supplied lifecycle hooks.
 *
 * @module
 */
import { HookInvokerOptionsEntity } from '../entities/HookInvokerOptionsEntity.js';
import { HookInvocationError } from './HookInvocationError.js';
import { HookTimeoutError } from './HookTimeoutError.js';
import { ReentrantHookInvocationError } from './ReentrantHookInvocationError.js';
import { ValidationError } from './ValidationError.js';

/**
 * Options accepted by the `HookInvoker` constructor. Both are opt-in and
 * default to off, preserving the exact prior behavior (unbounded wait, no
 * reentrancy detection) for every existing caller.
 *
 * `detectReentrancy`: when true, a synchronous, same-call-stack reentrant
 * call to `invoke` (a hook override calling back into whatever triggered
 * it, before that outer call has returned) throws
 * `ReentrantHookInvocationError` immediately instead of recursing. Scoped
 * to this one `HookInvoker` instance — a class needing per-key rather
 * than per-instance reentrancy detection (e.g. a keyed mutex, where
 * concurrent operations on *different* keys must not false-positive)
 * should not enable this and should instead track reentrancy itself,
 * keyed appropriately, reusing `ReentrantHookInvocationError` for
 * consistency.
 *
 * `timeoutMs`: when set, an asynchronous hook result races against this
 * timeout. If the hook neither resolves nor rejects in time, the race is
 * treated as a failure and routed to `onHookError` with a
 * `HookTimeoutError` cause — distinct from `HookInvocationError`, since
 * the hook produced no outcome at all rather than an outcome that
 * happened to be a rejection. Left unset, a hook may take arbitrarily
 * long, matching prior behavior.
 */
export type HookInvokerOptionsType = HookInvokerOptionsEntity.Type;

/**
 * A class holds a `HookInvoker` as a field and calls `invoke` from its own
 * methods — it is never extended. Composition, not inheritance, is
 * deliberate: single inheritance means a class that already extends
 * something else (its own base class, a delegate, anything) cannot also
 * extend a hook-invocation mixin. Every consumer of this monorepo's hook
 * mechanism — including external toolkit consumers who may have their own
 * base class — gets the same safety without spending their one `extends`
 * slot on it.
 *
 * `invoke` calls `fn` directly — it never `await`s at the call site, so a
 * genuinely synchronous caller never pays a microtask tick or `async`
 * contagion, and a genuinely synchronous hook never touches the Promise
 * machinery at all. This toolkit accepts arbitrary, unknown hook
 * implementations from external consumers; a hook typed to return `void`
 * structurally accepts an `async` override in TypeScript (the language's
 * void-return leniency), so nothing here can assume a hook stays
 * synchronous just because its declared signature says so. If `fn`'s
 * result turns out to be thenable, it is chained through a guaranteed
 * `.catch` that routes the failure to `onHookError` and can never surface
 * as an unhandled promise rejection — whether or not the calling method
 * itself awaits the returned value.
 *
 * `onHookError` — the failure-recovery extension point — gets the exact
 * same guarding as `fn` itself: its own result is checked for a thenable
 * and routed the same way, so a broken `onHookError` override (one that
 * itself throws asynchronously) cannot become an unhandled rejection
 * either. A synchronous throw from `onHookError` (including the default
 * implementation's own throw) propagates directly, matching the base
 * disposition. `onHookError`'s own failure is terminal — it is never
 * retried through itself, which would otherwise be able to loop forever
 * against a deterministically-broken override.
 *
 * For a caller that needs different failure disposition (swallow instead
 * of throw, record-and-continue, etc.), define a small subclass — hoisted
 * to module scope, taking whatever it needs from its owner via the
 * constructor — overriding `onHookError`, matching the delegate-class
 * idiom used elsewhere in this monorepo (e.g. `Paginator`'s
 * `PaginatorMachineDelegate`) rather than a constructor-injected strategy
 * callback, which this codebase's own [[no-interceptors-lifecycle-hooks]]
 * convention forbids one level up.
 */
export class HookInvoker {
  readonly #detectReentrancy: boolean;
  readonly #timeoutMs: number | undefined;
  #invoking = false;

  constructor(options?: HookInvokerOptionsType) {
    if (options !== undefined && !HookInvokerOptionsEntity.validate(options)) {
      throw ValidationError.create({
        'message': 'Must match HookInvokerOptionsEntity.Schema',
        'path': 'options'
      });
    }
    this.#detectReentrancy = options?.detectReentrancy ?? false;
    this.#timeoutMs = options?.timeoutMs;
  }

  /** Invokes `fn`, safely handling both a synchronous and an asynchronous result. */
  invoke<T>(hookName: string, fn: () => T): T {
    if (this.#detectReentrancy && this.#invoking) {
      throw new ReentrantHookInvocationError(hookName);
    }
    this.#invoking = true;
    try {
      return this.#guardResult(hookName, fn(), false);
    } catch (cause) {
      return this.#recoverFromFailure<T>(hookName, cause);
    } finally {
      this.#invoking = false;
    }
  }

  /** Routes a failure to `onHookError`, then guards its result the same way `fn`'s result is guarded. */
  #recoverFromFailure<T>(hookName: string, cause: unknown): T {
    const recovered = this.onHookError<T>(hookName, cause);
    return this.#guardResult(hookName, recovered, true);
  }

  /** Passes a synchronous result through unchanged; routes a thenable result through a guaranteed, non-throwing safety net. */
  #guardResult<T>(hookName: string, result: T, isRecoveryResult: boolean): T {
    if (!HookInvoker.#isThenable(result)) {
      return result;
    }
    const bounded = this.#timeoutMs === undefined ? Promise.resolve(result) : this.#raceWithTimeout(hookName, result, this.#timeoutMs);
    const guarded = this.#awaitAndRoute<T>(hookName, bounded, isRecoveryResult);
    // Backstop only — a failure is already routed through onHookError inside
    // #awaitAndRoute; this second, empty catch exists purely so an unawaited
    // hook result never surfaces as an unhandledRejection.
    guarded.catch(() => { });
    return guarded as T;
  }

  /** Races `pending` against `timeoutMs`, rejecting with `HookTimeoutError` if the timer wins. Clears the timer on either outcome. */
  async #raceWithTimeout<T>(hookName: string, pending: T, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { reject(new HookTimeoutError(hookName, timeoutMs)); }, timeoutMs);
    });
    try {
      return await Promise.race([Promise.resolve(pending), timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }

  async #awaitAndRoute<T>(hookName: string, pending: Promise<T>, isRecoveryResult: boolean): Promise<T> {
    try {
      return await pending;
    } catch (cause) {
      if (isRecoveryResult) {
        // The failure came from onHookError's own (async) result — terminal.
        // Do not call onHookError again: a deterministically-broken override
        // would otherwise loop forever against itself.
        throw cause;
      }
      return this.#recoverFromFailure<T>(hookName, cause);
    }
  }

  static #isThenable(value: unknown): value is PromiseLike<unknown> {
    return (typeof value === 'object' || typeof value === 'function') && value !== null && typeof (value as PromiseLike<unknown>).then === 'function';
  }

  /**
   * Handles a failure raised by a hook invoked via `invoke`.
   * The base implementation always throws a `HookInvocationError`.
   * Override to swallow the failure and return a sentinel value instead.
   *
   * Fire-point: called when `fn` throws, rejects, times out (if
   * `timeoutMs` is configured), or (for an unexpectedly async hook the
   * calling site never awaits) settles as a failure some time after
   * `invoke` already returned. Never logs internally.
   */
  protected onHookError<T>(hookName: string, cause: unknown): T {
    throw new HookInvocationError(hookName, cause);
  }
}
