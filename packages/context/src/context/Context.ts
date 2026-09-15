import { HookInvoker, RuntimeError } from '@studnicky/errors/browser';
import { Predicates } from '@studnicky/types/browser';

/**
 * Context implementation using ContextStorageInterface.
 */
import type { ContextLookupEntity } from '../entities/ContextLookupEntity.js';
import type { ContextConstructorInterface } from '../interfaces/ContextConstructorInterface.js';
import type { ContextInterface } from '../interfaces/ContextInterface.js';
import type { ContextRunResultInterface } from '../interfaces/ContextRunResultInterface.js';
import type { ContextScopeInterface } from '../interfaces/ContextScopeInterface.js';
import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

import { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { ContextScope } from './ContextScope.js';

/**
 * Isolated async context for Node and browser consumers.
 *
 * The Node entrypoint uses AsyncLocalStorage, so ordinary await retains the active
 * scope. Browser code retains Context through the transform; without the transform,
 * use scope.await(value) for awaited values and scope.bind(callback) for opaque
 * callbacks that settle within the operation. Use run() for automatic scope
 * termination. For a callback external code invokes later, use initialize() and
 * terminate the scope after removing that callback.
 *
 * @example Complete lifecycle
 * ```typescript
 * const requestContext = Context.create({ name: 'request' });
 *
 * // Initialize with values
 * const scope = requestContext.initialize({ requestId: '123', logger });
 *
 * // Execute within context
 * const result = await scope.execute(async () => {
 *   requestContext.set('statusCode', 200);
 *   return handleRequest();
 * });
 *
 * // Extract final state and cleanup
 * const finalState = scope.terminate();
 * ```
 *
 * @example Reading values anywhere in async chain
 * ```typescript
 * function logMessage(msg: string): void {
 *   const logger = requestContext.get('logger');
 *   if (logger instanceof Logger) logger.info(msg);
 * }
 * ```
 */
export class Context implements ContextInterface {
  /**
   * Create a new Context instance.
   *
   * @param config - Configuration options
   * @returns New Context instance
   *
   * @example
   * ```typescript
   * const context = Context.create({ name: 'request' });
   * ```
   */
  static create<TInstance extends Context = Context>(
    this: ContextConstructorInterface<TInstance>,
    config: ContextConfigEntity.Type,
    storage: ContextStorageInterface
  ): TInstance {
    const result: unknown = Reflect.construct(this, [config, storage]);
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf<TInstance>(result, this)) {
      throw RuntimeError.create('Context.create() did not construct the requested subclass.');
    }
    return result;
  }

  /**
   * Shared, never-written-to store returned by #getStore() when no context is
   * active and onMissingContext() opts into lenient mode.
   *
   * Safe to share across calls and instances because #getStore() only backs
   * read-only accessors (get, has, keys, snapshot). Mutating accessors (set,
   * delete) go through getMutableStore() instead, which allocates a fresh,
   * isolated Map so that writes made outside an active context stay inert
   * and never leak into this shared instance or between unrelated callers.
   */
  static readonly #EMPTY_STORE: Map<string, unknown> = new Map();

  readonly #storage: ContextStorageInterface;

  /**
   * The name of this context (from config).
   */
  readonly name: string;

  protected readonly hooks: HookInvoker = new HookInvoker();

  protected constructor(
    config: ContextConfigEntity.Type,
    storage: ContextStorageInterface | undefined
  ) {
    if (!ContextConfigEntity.validate(config)) {
      throw new ContextConfigError('invalid Context config');
    }

    this.name = config.name;
    if (storage === undefined) {
      throw new ContextError(`No context storage is configured for ${this.name}. Import @studnicky/context/node or provide a ContextStorageInterface to Context.create().`);
    }
    this.#storage = storage;
  }

  /**
   * Retrieves the current context store from ContextStorageInterface for read-only access.
   *
   * If the store is absent, calls onMissingContext(). If that hook returns true,
   * the throw is suppressed and a shared, empty Map is returned. Otherwise throws.
   *
   * Only safe for callers that never mutate the returned Map - use
   * getMutableStore() instead when a write is intended.
   *
   * @returns The current context Map
   * @throws {ContextError} If no active context exists and onMissingContext returns false
   */
  #getStore(): Map<string, unknown> {
    const store = this.#storage.getStore();

    if (store === undefined) {
      if (this.onMissingContext()) {return Context.#EMPTY_STORE;}

      throw new ContextError(`No active ${this.name} context - ensure code runs within execute()`);
    }

    return store;
  }

  /**
   * Retrieves the current context store from ContextStorageInterface for a mutating operation.
   *
   * Identical fallback semantics to the read accessors, except the lenient-mode fallback
   * allocates a fresh, isolated Map so that writes made outside an active context
   * are discarded rather than persisted into a store visible to other callers.
   *
   * @returns The current context Map
   * @throws {ContextError} If no active context exists and onMissingContext returns false
   */
  private getMutableStore(): Map<string, unknown> {
    const store = this.#storage.getStore();

    if (store === undefined) {
      if (this.onMissingContext()) {return new Map();}

      throw new ContextError(`No active ${this.name} context - ensure code runs within execute()`);
    }

    return store;
  }

  /**
   * Hook called when a store access is attempted outside an active context.
   *
   * Return true to suppress the throw (read accessors return empty results).
   * Return false (default) to let the ContextError propagate.
   *
   * Subclasses override to implement lenient-mode or logging behavior.
   */
  protected onMissingContext(_key?: string): boolean {
    const result = _key === undefined && false;
    return result;
  }

  /**
   * Hook called at the end of initialize(), after the scope is constructed.
   *
   * Subclasses override to seed default values or perform post-initialization
   * setup on the new scope.
   *
   * @param initial - The initial values passed to initialize()
   * @param scope - The newly created context scope
   */
  protected onInitialize(
    _initial: Record<string, unknown> | undefined,
    _scope: ContextScopeInterface
  ): void {}

  /**
   * Hook called after `set()` stores a value in the context.
   *
   * Subclasses override to observe or trace write operations.
   *
   * @param _key - The key that was set
   * @param _value - The value that was stored
   */
  protected onSet(_key: string, _value: unknown): void {}

  /**
   * Hook called after a successful `get()` retrieval.
   *
   * Only fires when the key exists and the value is returned.
   * Does NOT fire for `tryGet()` (that is a silent path).
   *
   * @param _key - The key that was retrieved
   * @param _value - The value that was returned
   */
  protected onGet(_key: string, _value: unknown): void {}

  /**
   * Hook called after `delete()` removes (or attempts to remove) a key.
   *
   * @param _key - The key that was targeted
   * @param _existed - Whether the key existed before deletion
   */
  protected onDelete(_key: string, _existed: boolean): void {}

  /**
   * Removes a value from the context.
   *
   * @param key - The key to remove
   * @returns true if the key existed and was removed
   * @throws {ContextError} If no context is active
   */
  delete(key: string): boolean {
    const result = this.getMutableStore().delete(key);
    this.hooks.invoke('onDelete', () => {
      const hookResult = this.onDelete(key, result);
      return hookResult;
    });
    return result;
  }

  /**
   * Gets a value from the context by key.
   * Throws if key doesn't exist.
   *
   * @param key - The key to retrieve
   * @returns The stored value as `unknown`; callers narrow from runtime evidence
   * @throws {ContextError} If no context is active or key doesn't exist
   */
  get(key: string): unknown {
    const store = this.#getStore();

    if (!store.has(key)) {
      throw new ContextError(`Key '${key}' not found in ${this.name} context`);
    }

    const value = store.get(key);
    this.hooks.invoke('onGet', () => {
      const hookResult = this.onGet(key, value);
      return hookResult;
    });
    return value;
  }

  /**
   * Checks if a key exists in the context.
   *
   * @param key - The key to check
   * @returns true if the key exists
   * @throws {ContextError} If no context is active
   */
  has(key: string): boolean {
    if (this.#getStore().has(key)) {
      return true;
    }
    return false;
  }

  /**
   * Initialize a new context scope with optional initial values.
   *
   * Returns a context scope that can execute work within the context and terminate
   * when done. Use it for an opaque callback that external code invokes later;
   * remove that callback before terminating the scope.
   *
   * @param initial - Optional initial key-value pairs
   * @returns A new context scope ready for execution
   *
   * @example
   * ```typescript
   * const scope = context.initialize({ requestId: '123', logger });
   * await scope.execute(async () => { ... });
   * const state = scope.terminate();
   * ```
   */
  initialize(initial?: Record<string, unknown>): ContextScopeInterface {
    const scope = new ContextScope(this.name, this.#storage, initial);

    this.hooks.invoke('onInitialize', () => {
      const hookResult = this.onInitialize(initial, scope);
      return hookResult;
    });

    return scope;
  }

  /**
   * Runs work that settles within an operation in a fresh scope, then terminates
   * the scope and returns the operation value with the final snapshot. In browser
   * code without the transform, use scope.await(value) and scope.bind(callback)
   * inside that operation. For an opaque callback external code invokes later, use
   * initialize(), remove the callback when it is no longer needed, then terminate
   * the scope.
   */
  run<TResult>(
    initial: Record<string, unknown>,
    operation: (scope: ContextScopeInterface) => Promise<TResult>
  ): Promise<ContextRunResultInterface<TResult>>;

  run<TResult>(
    initial: Record<string, unknown>,
    operation: (scope: ContextScopeInterface) => TResult
  ): ContextRunResultInterface<TResult>;

  run<TResult>(
    initial: Record<string, unknown>,
    operation: (scope: ContextScopeInterface) => TResult | Promise<TResult>
  ): ContextRunResultInterface<TResult> | Promise<ContextRunResultInterface<TResult>> {
    const scope = this.initialize(initial);
    let value: TResult | Promise<TResult>;

    try {
      value = scope.execute(() => {
        const result = operation(scope);
        return result;
      });
    } catch (error) {
      scope.terminate();
      throw error;
    }

    if (value instanceof Promise) {
      const result = value.then(
        (resolvedValue) => {
          const snapshot = scope.terminate();
          return { 'snapshot': snapshot, 'value': resolvedValue };
        },
        (error: unknown) => {
          scope.terminate();
          throw error;
        }
      );
      return result;
    }

    const snapshot = scope.terminate();
    return { 'snapshot': snapshot, 'value': value };
  }

  /**
   * Checks if a context is currently active.
   *
   * @returns true if within an active context
   */
  isActive(): boolean {
    const result = this.#storage.getStore() !== undefined;
    return result;
  }

  /**
   * Gets all keys in the context.
   *
   * @returns Array of keys
   * @throws {ContextError} If no context is active
   */
  keys(): string[] {
    const store = this.#getStore();
    return [...store.keys()];
  }

  /**
   * Sets a value in the context.
   *
   * @typeParam T - The type of the value
   * @param key - The key to set
   * @param value - The value to store
   * @throws {ContextError} If no context is active
   */
  set(key: string, value: unknown): void {
    this.getMutableStore().set(key, value);
    this.hooks.invoke('onSet', () => {
      const hookResult = this.onSet(key, value);
      return hookResult;
    });
  }

  /**
   * Gets a shallow copy of all context data.
   *
   * @returns Copy of the context contents
   * @throws {ContextError} If no context is active
   */
  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.#getStore()) {
      Reflect.set(result, key, value);
    }
    return result;
  }

  /**
   * Gets a presence-aware value from the context without throwing.
   *
   * Unlike `get()`, this never throws. `found` distinguishes a missing key
   * from a key whose stored value is explicitly `undefined`.
   *
   * @param key - The key to retrieve
   * @returns Presence and the stored value as `unknown`
   */
  tryGet(key: string): ContextLookupEntity.Type {
    const store = this.#storage.getStore();
    if (store?.has(key) !== true) {
      return { 'found': false, 'value': undefined };
    }
    return { 'found': true, 'value': store.get(key) };
  }
}
