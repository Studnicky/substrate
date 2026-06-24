import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Context implementation using AsyncLocalStorage.
 */
import type { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import type { ContextInterface } from '../interfaces/ContextInterface.js';

import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { ContextBuilder } from './ContextBuilder.js';
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
 *   const logger = requestContext.get<Logger>('logger');
 *   logger.info(msg);
 * }
 * ```
 */
export class Context implements ContextInterface {
  /**
   * Create a fluent builder for constructing a Context instance.
   *
   * @returns A new ContextBuilder
   *
   * @example
   * ```typescript
   * const context = Context.builder().name('request').build();
   * ```
   */
  static builder(): ContextBuilder {
    // Factory closure so `create` retains its `this` binding when the builder calls it.
    const result = ContextBuilder.create((config) => { const result = Context.create(config); return result; });
    return result;
  }

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

  readonly #storage: AsyncLocalStorage<Map<string, unknown>>;

  /**
   * The name of this context (from config).
   */
  readonly name: string;

  protected constructor(config: ContextConfigEntity.Type) {
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new ContextConfigError('name must be a non-empty string');
    }

    this.name = config.name;
    this.#storage = new AsyncLocalStorage<Map<string, unknown>>();
  }

  /**
   * Retrieves the current context store from AsyncLocalStorage.
   *
   * If the store is absent, calls onMissingContext(). If that hook returns true,
   * the throw is suppressed and an empty Map is returned. Otherwise throws.
   *
   * @returns The current context Map
   * @throws {ContextError} If no active context exists and onMissingContext returns false
   */
  protected getStore(): Map<string, unknown> {
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
   * Return true to suppress the throw (getStore returns an empty Map).
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
   * @param scope - The newly created ContextScope
   */
  protected onInitialize(
    _initial: Record<string, unknown> | undefined,
    _scope: ContextScope
  ): void {}

  /**
   * Removes a value from the context.
   *
   * @param key - The key to remove
   * @returns true if the key existed and was removed
   * @throws {ContextError} If no context is active
   */
  delete(key: string): boolean {
    const result = this.getStore().delete(key);
    return result;
  }

  /**
   * Gets a value from the context by key.
   * Throws if key doesn't exist.
   *
   * @typeParam T - The expected type of the value
   * @param key - The key to retrieve
   * @returns The value
   * @throws {ContextError} If no context is active or key doesn't exist
   */
  get<T>(key: string): T {
    const store = this.getStore();

    if (!store.has(key)) {
      throw new ContextError(`Key '${key}' not found in ${this.name} context`);
    }

    return store.get(key) as T;
  }

  /**
   * Checks if a key exists in the context.
   *
   * @param key - The key to check
   * @returns true if the key exists
   * @throws {ContextError} If no context is active
   */
  has(key: string): boolean {
    const result = this.getStore().has(key);
    return result;
  }

  /**
   * Initialize a new context scope with optional initial values.
   *
   * Returns a ContextScope that can be used to execute code within
   * the context and terminate when done.
   *
   * @param initial - Optional initial key-value pairs
   * @returns A new ContextScope ready for execution
   *
   * @example
   * ```typescript
   * const scope = context.initialize({ requestId: '123', logger });
   * await scope.execute(async () => { ... });
   * const state = scope.terminate();
   * ```
   */
  initialize(initial?: Record<string, unknown>): ContextScope {
    const options = initial !== undefined
      ? { 'initial': initial, 'name': this.name, 'storage': this.#storage }
      : { 'name': this.name, 'storage': this.#storage };
    const scope = ContextScope.create(options);

    this.onInitialize(initial, scope);

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
    const store = this.getStore();
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
    this.getStore().set(key, value);
  }

  /**
   * Gets a shallow copy of all context data.
   *
   * @returns Copy of the context contents
   * @throws {ContextError} If no context is active
   */
  snapshot(): Record<string, unknown> {
    const result = Object.fromEntries(this.getStore());
    return result;
  }

  /**
   * Gets a value from the context by key, or undefined if not found or not active.
   *
   * Unlike `get()`, this never throws — returns undefined both when no active
   * context exists and when the key is not present.
   *
   * @typeParam T - The expected type of the value
   * @param key - The key to retrieve
   * @returns The value, or undefined
   */
  tryGet<T>(key: string): T | undefined {
    const result = this.#storage.getStore()?.get(key) as T | undefined;
    return result;
  }
}
