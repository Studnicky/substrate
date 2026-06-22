import type { AsyncLocalStorage } from 'node:async_hooks';

/**
 * ContextScope - An initialized context ready for execution.
 *
 * Returned from `Context.initialize()`. Manages the execute/terminate lifecycle
 * with an explicit FSM: created → active → terminated.
 */
import type { ContextScopeInterface } from '../interfaces/ContextScopeInterface.js';

import { ContextError } from '../errors/ContextError.js';

type ContextScopeState = 'active' | 'created' | 'terminated';

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
  #state: ContextScopeState = 'created';

  /**
   * The name of this scope, used in error messages.
   */
  protected readonly name: string;

  constructor(
    name: string,
    storage: AsyncLocalStorage<Map<string, unknown>>,
    initial?: Record<string, unknown>
  ) {
    this.name = name;
    this.#storage = storage;
    this.#store = initial !== undefined
      ? new Map(Object.entries(initial))
      : new Map();
    // FSM: created → active
    this.transition('active');
  }

  /**
   * Transition the FSM to a new state.
   * Subclasses can override onEnter() to react to transitions.
   */
  protected transition(to: ContextScopeState): void {
    const from = this.#state;

    if (!this.guard(from, to)) {
      throw new ContextError(`Illegal state transition: ${from} → ${to}`);
    }

    this.#state = to;
    this.onEnter(to, from);
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
  protected guard(from: ContextScopeState, to: ContextScopeState): boolean {
    if (from === 'created' && to === 'active') return true;
    if (from === 'active' && to === 'terminated') return true;

    return false;
  }

  /**
   * Hook called when the FSM enters a new state.
   * Subclasses override to react to state changes.
   */
  protected onEnter(_to: ContextScopeState, _from: ContextScopeState): void {}

  /**
   * The current FSM state.
   */
  protected get state(): ContextScopeState {
    return this.#state;
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
   * Hook called during terminate() with the final snapshot.
   * Subclasses override to augment or observe the snapshot.
   *
   * @param snapshot - The final key-value snapshot
   * @returns The (possibly augmented) snapshot returned from terminate()
   */
  protected onTerminate(snapshot: Record<string, unknown>): Record<string, unknown> {
    return snapshot;
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
   */
  execute<TResult>(fn: () => TResult): TResult {
    if (this.#state === 'terminated') {
      this.onTerminatedAccess();
      throw new ContextError(`${this.name} scope has been terminated`);
    }

    this.onBeforeExecute();
    const result = this.#storage.run(this.#store, fn);

    this.onAfterExecute();

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

    return this.onTerminate(snapshot);
  }
}
