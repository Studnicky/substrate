import type { AsyncLocalStorage } from 'node:async_hooks';

import { HookInvoker } from '@studnicky/errors';

/**
 * ContextScope - An initialized context ready for execution.
 *
 * Returned from `Context.initialize()`. Manages the execute/terminate lifecycle
 * with an explicit FSM: created → active → terminated.
 */
import type { ContextScopeStateEntity } from '../entities/ContextScopeStateEntity.js';
import type { ContextScopeInterface } from '../interfaces/ContextScopeInterface.js';

import { ContextError } from '../errors/ContextError.js';

/**
 * An initialized context scope returned from Context.initialize().
 *
 * Represents a prepared execution context with optional initial values.
 * Use execute() to run code within the context, then terminate() to
 * extract final state and clean up.
 *
 * ## Lifecycle FSM
 *
 * created → active → terminated
 *
 * - `created → active`: transition at construction (initialization complete)
 * - `active → terminated`: via terminate()
 * - `terminated`: terminal state; execute() throws
 *
 * ## State Accumulation
 *
 * Multiple `execute()` calls on the same scope share the same underlying store.
 * State set in one execution persists to subsequent executions:
 *
 * ```typescript
 * scope.execute(() => context.set('a', 1));
 * scope.execute(() => context.set('b', 2));
 * scope.terminate(); // { a: 1, b: 2 }
 * ```
 *
 * ## Async Propagation
 *
 * Context automatically propagates through async boundaries. Values remain
 * accessible through promises, timers, and callbacks:
 *
 * ```typescript
 * await scope.execute(async () => {
 *   await setTimeout(100);
 *   context.get('key'); // Still works
 * });
 * ```
 *
 * @example Basic usage
 * ```typescript
 * const scope = requestContext.initialize({ requestId: '123', logger });
 *
 * const result = await scope.execute(async () => {
 *   requestContext.set('statusCode', 200);
 *   return handleRequest();
 * });
 *
 * const finalState = scope.terminate();
 * // { requestId: '123', logger: ..., statusCode: 200 }
 * ```
 *
 * @example Try/finally pattern for guaranteed cleanup
 * ```typescript
 * const scope = context.initialize({ startTime: Date.now() });
 *
 * try {
 *   await scope.execute(async () => {
 *     // May throw
 *     await processRequest();
 *   });
 * } finally {
 *   const metrics = scope.terminate();
 *   recordMetrics(metrics);
 * }
 * ```
 */
export class ContextScope implements ContextScopeInterface {
  readonly #storage: AsyncLocalStorage<Map<string, unknown>>;
  readonly #store: Map<string, unknown>;
  #state: ContextScopeStateEntity.Type = 'created';

  /**
   * The name of this scope, used in error messages.
   */
  protected readonly name: string;

  protected readonly hooks: HookInvoker = new HookInvoker();

  constructor(
    name: string,
    storage: AsyncLocalStorage<Map<string, unknown>>,
    initial?: Record<string, unknown>
  ) {
    this.name = name;
    this.#storage = storage;
    this.#store = initial !== undefined
      ? new Map<string, unknown>(Object.entries(initial))
      : new Map<string, unknown>();
    // FSM: created → active
    this.transition('active');
  }

  /**
   * Transition the FSM to a new state.
   * Subclasses can override onExit() and onEnter() to react to transitions.
   */
  protected transition(to: ContextScopeStateEntity.Type): void {
    const from = this.#state;

    if (!this.guard(from, to)) {
      throw new ContextError(`Illegal state transition: ${from} → ${to}`);
    }

    this.hooks.invoke('onExit', () => {
      const hookResult = this.onExit(from, to);
      return hookResult;
    });
    this.#state = to;
    this.hooks.invoke('onEnter', () => {
      const hookResult = this.onEnter(to, from);
      return hookResult;
    });
  }

  /**
   * Guard: returns true if the from → to transition is legal.
   *
   * Legal edges:
   * - created → active (initialization)
   * - active → terminated (termination)
   *
   * All other transitions are illegal.
   */
  protected guard(from: ContextScopeStateEntity.Type, to: ContextScopeStateEntity.Type): boolean {
    if (from === 'created' && to === 'active') {return true;}
    if (from === 'active' && to === 'terminated') {return true;}

    return false;
  }

  /**
   * Hook called before the FSM leaves a state, before `#state` is updated.
   *
   * Fires in `transition()` after the guard check, before `#state` is assigned
   * and before `onEnter` is called.
   *
   * @param _from - The state being left
   * @param _to - The state being entered
   */
  protected onExit(_from: ContextScopeStateEntity.Type, _to: ContextScopeStateEntity.Type): void {}

  /**
   * Hook called when the FSM enters a new state.
   * Subclasses override to react to state changes.
   */
  protected onEnter(_to: ContextScopeStateEntity.Type, _from: ContextScopeStateEntity.Type): void {}

  /**
   * The current FSM state.
   */
  protected get state(): ContextScopeStateEntity.Type {
    const result = this.#state;
    return result;
  }

  /**
   * Hook called before each execute() invocation.
   * Subclasses override to add pre-execution behavior.
   */
  protected onBeforeExecute(): void {}

  /**
   * Hook called after each execute() invocation completes.
   * Subclasses override to add post-execution behavior.
   */
  protected onAfterExecute(): void {}

  /**
   * Hook called when the function passed to `execute()` throws.
   *
   * Fires before the error is re-thrown. The scope remains usable after
   * (the fn threw, not the scope itself).
   *
   * @param _error - The error thrown by the wrapped function
   */
  protected onError(_error: unknown): void {}

  /**
   * Hook called in `terminate()` after the internal store is cleared.
   *
   * Fires after `this.#store.clear()`, before `onTerminate` is called.
   */
  protected onDispose(): void {}

  /**
   * Hook called during terminate() with the final snapshot.
   * Subclasses override to augment or observe the snapshot.
   *
   * @param snapshot - The final key-value snapshot
   * @returns The (possibly augmented) snapshot returned from terminate()
   */
  protected onTerminate(snapshot: Record<string, unknown>): Record<string, unknown> {
    const result = snapshot;
    return result;
  }

  /**
   * Hook called when execute() is called on a terminated scope, before the throw.
   * Subclasses override to observe or log the illegal access.
   * The throw always follows, regardless of hook return.
   */
  protected onTerminatedAccess(): void {}

  /**
   * Execute a function within this context scope.
   *
   * The context is active only during execution. Multiple calls to execute()
   * share the same underlying store, allowing state to accumulate across calls.
   *
   * @typeParam TResult - Return type of the function
   * @param fn - Function to execute within the context
   * @returns The result of the function (or Promise if fn is async)
   * @throws {ContextError} If scope has been terminated
   *
   * @remarks
   * When `fn` is async (returns a Promise), `onAfterExecute()` fires only
   * after the returned promise resolves, and `onError()` fires if it
   * rejects instead. The returned promise still resolves/rejects exactly
   * as `fn`'s promise does.
   */
  execute<TResult>(fn: () => TResult): TResult {
    if (this.#state === 'terminated') {
      this.hooks.invoke('onTerminatedAccess', () => {
        const hookResult = this.onTerminatedAccess();
        return hookResult;
      });
      throw new ContextError(`${this.name} scope has been terminated`);
    }

    this.hooks.invoke('onBeforeExecute', () => {
      const hookResult = this.onBeforeExecute();
      return hookResult;
    });
    let result: TResult;
    try {
      result = this.#storage.run(this.#store, fn);
    } catch (error) {
      this.hooks.invoke('onError', () => {
        const hookResult = this.onError(error);
        return hookResult;
      });
      throw error;
    }

    if (result instanceof Promise) {
      result.then(
        () => {
          this.hooks.invoke('onAfterExecute', () => {
            const hookResult = this.onAfterExecute();
            return hookResult;
          });
        },
        (error: unknown) => {
          this.hooks.invoke('onError', () => {
            const hookResult = this.onError(error);
            return hookResult;
          });
        }
      );

      return result;
    }

    this.hooks.invoke('onAfterExecute', () => {
      const hookResult = this.onAfterExecute();
      return hookResult;
    });

    return result;
  }

  /**
   * Terminate the scope, extracting final state and preventing further execution.
   *
   * Returns a snapshot of all values accumulated during execution.
   * After termination, execute() will throw and the internal store is cleared.
   *
   * @returns Snapshot of all context values at termination (possibly augmented by onTerminate)
   * @throws {ContextError} If already terminated
   */
  terminate(): Record<string, unknown> {
    if (this.#state === 'terminated') {
      throw new ContextError(`${this.name} scope has already been terminated`);
    }

    this.transition('terminated');

    const snapshot = Object.fromEntries(this.#store);

    this.#store.clear();
    this.hooks.invoke('onDispose', () => {
      const hookResult = this.onDispose();
      return hookResult;
    });

    return this.onTerminate(snapshot);
  }
}
