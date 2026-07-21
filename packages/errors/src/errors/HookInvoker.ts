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

/** Builds detached diagnostic graphs while preserving canonical hook-error classes. */
class HookDiagnosticSnapshot {
  static value(value: unknown, seen: WeakMap<object, unknown>): unknown {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      return value;
    }

    const existing = seen.get(value);
    if (existing !== undefined) {
      return existing;
    }

    if (value instanceof Error) {
      let snapshot: Error;
      if (value instanceof HookInvocationError) {
        snapshot = new HookInvocationError(value.hookName, undefined);
      } else if (value instanceof HookTimeoutError) {
        snapshot = new HookTimeoutError(value.hookName, value.timeoutMs);
      } else if (value instanceof ReentrantHookInvocationError) {
        snapshot = new ReentrantHookInvocationError(value.hookName);
      } else {
        snapshot = new Error(value.message, { 'cause': undefined });
      }
      seen.set(value, snapshot);
      for (const key of Reflect.ownKeys(value)) {
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, HookDiagnosticSnapshot.value(propertyValue, seen));
      }
      return snapshot;
    }

    if (Array.isArray(value)) {
      const snapshot: unknown[] = [];
      seen.set(value, snapshot);
      for (const key of Reflect.ownKeys(value)) {
        if (key === 'length') {
          continue;
        }
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, HookDiagnosticSnapshot.value(propertyValue, seen));
      }
      return snapshot;
    }

    if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
      const snapshot: Record<string, unknown> = {};
      seen.set(value, snapshot);
      for (const key of Reflect.ownKeys(value)) {
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, HookDiagnosticSnapshot.value(propertyValue, seen));
      }
      return snapshot;
    }

    try {
      const snapshot: object = structuredClone(value);
      return snapshot;
    } catch {
      const snapshot: Record<string, unknown> = {};
      seen.set(value, snapshot);
      for (const key of Reflect.ownKeys(value)) {
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, HookDiagnosticSnapshot.value(propertyValue, seen));
      }
      return snapshot;
    }
  }
}

/**
 * Options accepted by the `HookInvoker` constructor. Both are opt-in and
 * default to off: hook completion is unbounded and reentrancy detection is
 * disabled unless configured.
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
 * happened to be a rejection. Left unset, a hook may take arbitrarily long.
 */
/**
 * A domain owner composes a `HookInvoker` as a field and calls `invoke` from
 * its own methods. It may use the base invoker or a small private static
 * named subclass for package-specific
 * failure disposition. The domain owner itself does not inherit
 * `HookInvoker`, preserving its inheritance slot.
 *
 * `invoke` calls `fn` directly — it never `await`s at the call site, so a
 * genuinely synchronous caller never pays a microtask tick or `async`
 * contagion, and a genuinely synchronous hook never touches the Promise
 * machinery at all. This toolkit accepts arbitrary, unknown hook
 * implementations from external consumers; a hook typed to return `void`
 * structurally accepts an `async` override in TypeScript (the language's
 * void-return leniency), so nothing here can assume a hook stays
 * synchronous just because its declared signature says so. If `fn`'s
 * result turns out to be thenable, the shared completion path routes a
 * failure to `onHookError` and can never surface it as an unhandled promise
 * rejection. Fire-and-forget `invoke` internally observes terminal async
 * failures; completion-observed `invokeAsync` propagates them to its caller.
 *
 * Hook return values are deliberately discarded. `invoke` never exposes a
 * thenable's completion, while `invokeAsync` exposes completion as
 * `Promise<void>`. Fire-and-forget callers remain protected because their
 * completion path settles terminal async failures internally.
 *
 * `onHookError` — the failure-disposition extension point — gets the exact
 * same completion guarding as `fn` itself: its own result is checked for a
 * thenable, so a broken `onHookError` override (one that itself throws
 * asynchronously) cannot become an unhandled rejection either. A
 * synchronous throw reached while `invoke` is still executing propagates
 * directly. A terminal failure reached during asynchronous completion is
 * observed by `invoke` and propagated by `invokeAsync`. `onHookError`'s own
 * failure is never retried through itself, which would otherwise be able to
 * loop forever against a deterministically-broken override.
 *
 * For a caller that needs different failure disposition (swallow instead
 * of throw, swallow-and-continue, etc.), define a private static named
 * `HookInvoker` subclass on the owning class and override `onHookError` to
 * complete normally. The invoker remains the sole diagnostic state owner;
 * the owning class delegates its diagnostic count and projection to
 * `hookErrorCount` and `getHookErrors()` rather than retaining another array.
 */
export class HookInvoker {
  readonly #detectReentrancy: boolean;
  readonly #hookErrors: HookInvocationError[] = [];
  readonly #timeoutMs: number | undefined;
  #invoking = false;

  constructor(options?: HookInvokerOptionsEntity.Type) {
    if (options !== undefined && !HookInvokerOptionsEntity.validate(options)) {
      throw ValidationError.create({
        'message': 'Must match HookInvokerOptionsEntity.Schema',
        'path': 'options'
      });
    }
    this.#detectReentrancy = options?.detectReentrancy ?? false;
    this.#timeoutMs = options?.timeoutMs;
  }

  /** Invokes `fn` synchronously and guards any asynchronous completion without exposing it. */
  invoke(hookName: string, fn: () => unknown): void {
    const completion = this.#invokeCompletion(hookName, fn, false);
    if (completion !== undefined) { return; }
  }

  /** Invokes `fn` immediately and exposes its synchronous or asynchronous completion as a promise. */
  async invokeAsync(hookName: string, fn: () => unknown): Promise<void> {
    await this.#invokeCompletion(hookName, fn, true);
  }

  /** Number of hook failures recorded by this invoker. */
  get hookErrorCount(): number {
    return this.#hookErrors.length;
  }

  /** Detached diagnostics for every hook failure recorded by this invoker. */
  getHookErrors(): readonly HookInvocationError[] {
    const result: HookInvocationError[] = [];
    for (const error of this.#hookErrors) {
      const snapshot = HookDiagnosticSnapshot.value(error, new WeakMap());
      if (!(snapshot instanceof HookInvocationError)) {
        throw new TypeError('Hook diagnostic projection must preserve HookInvocationError');
      }
      result.push(snapshot);
    }
    return result;
  }

  /** Shared invocation path for synchronous entry, runtime thenables, failure routing, and completion guards. */
  #invokeCompletion(hookName: string, fn: () => unknown, propagateTerminalFailure: boolean): Promise<void> | undefined {
    if (this.#detectReentrancy && this.#invoking) {
      throw new ReentrantHookInvocationError(hookName);
    }
    this.#invoking = true;
    try {
      return this.#guardCompletion(hookName, fn(), false, propagateTerminalFailure);
    } catch (cause) {
      return this.#routeHookFailure(hookName, cause, false, propagateTerminalFailure);
    } finally {
      this.#invoking = false;
    }
  }

  /** Discards a synchronous value and routes a thenable through the selected terminal-failure disposition. */
  #guardCompletion(
    hookName: string,
    result: unknown,
    isFailureHandlerResult: boolean,
    propagateTerminalFailure: boolean
  ): Promise<void> | undefined {
    if (!HookInvoker.#isThenable(result)) {
      return undefined;
    }
    const bounded = this.#timeoutMs === undefined ? Promise.resolve(result) : this.#raceWithTimeout(hookName, result, this.#timeoutMs);
    return this.#awaitAndRoute(hookName, bounded, isFailureHandlerResult, propagateTerminalFailure);
  }

  /** Races `pending` against `timeoutMs`, rejecting with `HookTimeoutError` if the timer wins. Clears the timer on either outcome. */
  async #raceWithTimeout(hookName: string, pending: PromiseLike<unknown>, timeoutMs: number): Promise<unknown> {
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

  async #awaitAndRoute(
    hookName: string,
    pending: Promise<unknown>,
    isFailureHandlerResult: boolean,
    propagateTerminalFailure: boolean
  ): Promise<void> {
    try {
      await pending;
    } catch (cause) {
      if (isFailureHandlerResult) {
        if (propagateTerminalFailure) { throw cause; }
        return;
      }

      await this.#routeHookFailure(hookName, cause, true, propagateTerminalFailure);
    }
  }

  /** Snapshots and records one hook failure before applying its terminal disposition. */
  #routeHookFailure(
    hookName: string,
    cause: unknown,
    asynchronousFailure: boolean,
    propagateTerminalFailure: boolean
  ): Promise<void> | undefined {
    const diagnostic = HookDiagnosticSnapshot.value(
      new HookInvocationError(hookName, cause),
      new WeakMap()
    );
    if (!(diagnostic instanceof HookInvocationError)) {
      throw new TypeError('Hook diagnostic storage must preserve HookInvocationError');
    }
    this.#hookErrors.push(diagnostic);

    let failureHandlerResult: unknown;
    try {
      failureHandlerResult = this.onHookError(hookName, cause);
    } catch (terminalCause) {
      if (!asynchronousFailure || propagateTerminalFailure) {
        throw terminalCause;
      }
      return undefined;
    }
    return this.#guardCompletion(hookName, failureHandlerResult, true, propagateTerminalFailure);
  }

  static #isThenable(value: unknown): value is PromiseLike<unknown> {
    return (typeof value === 'object' || typeof value === 'function') && value !== null && 'then' in value && typeof value.then === 'function';
  }

  /**
   * Handles a failure raised by a hook invoked via `invoke`.
   * The base implementation always throws a `HookInvocationError`.
   * Override to swallow the failure by completing normally. The invoker records
   * diagnostics before this disposition runs; an override must not record a
   * second owner-level copy.
   *
   * Fire-point: called when `fn` throws, rejects, times out (if
   * `timeoutMs` is configured), or (for an unexpectedly async hook the
   * calling site never awaits) settles as a failure some time after
   * `invoke` already returned. Never logs internally.
   */
  protected onHookError(hookName: string, cause: unknown): Promise<void> | void {
    throw new HookInvocationError(hookName, cause);
  }
}
