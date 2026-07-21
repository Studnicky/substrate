import { HookInvoker } from '@studnicky/errors';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Context implementation using AsyncLocalStorage.
 */
import type { ContextLookupEntity } from '../entities/ContextLookupEntity.js';
import type { ContextInterface } from '../interfaces/ContextInterface.js';
import type { ContextScopeInterface } from '../interfaces/ContextScopeInterface.js';

import { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { ContextScope } from './ContextScope.js';

/**
 * Isolated per-request async context using AsyncLocalStorage.
 *
 * Use initialize() to create a scope, execute() to run code within it,
 * and terminate() to extract final state.
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
  static create(config: ContextConfigEntity.Type): Context {
    // `new this(...)` so subclass factories return the subclass instance.
    const result = new this(config);
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

  readonly #storage: AsyncLocalStorage<Map<string, unknown>>;

  /**
   * The name of this context (from config).
   */
  readonly name: string;

  protected readonly hooks: HookInvoker = new HookInvoker();

  protected constructor(config: ContextConfigEntity.Type) {
    if (!ContextConfigEntity.validate(config)) {
      throw new ContextConfigError('invalid Context config');
    }

    this.name = config.name;
    this.#storage = new AsyncLocalStorage<Map<string, unknown>>();
  }

  /**
   * Retrieves the current context store from AsyncLocalStorage for read-only access.
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
   * Retrieves the current context store from AsyncLocalStorage for a mutating operation.
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
    const result = false;
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
    const result = this.#getStore().has(key);
    return result;
  }

  /**
   * Initialize a new context scope with optional initial values.
   *
   * Returns a context scope that can be used to execute code within
   * the context and terminate when done.
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
   * Checks if a context is currently active.
   *
   * @returns true if within an active context
   */
  isActive(): boolean {
    return this.#storage.getStore() !== undefined;
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
  set<T>(key: string, value: T): void {
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
    const result = Object.fromEntries(this.#getStore());
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
