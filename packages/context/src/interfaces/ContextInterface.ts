import type { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import type { ContextLookupEntity } from '../entities/ContextLookupEntity.js';
import type { ContextRunResultInterface } from './ContextRunResultInterface.js';
import type { ContextScopeInterface } from './ContextScopeInterface.js';

/**
 * Provides scoped key-value storage that propagates through asynchronous execution boundaries.
 */
export interface ContextInterface extends ContextConfigEntity.Type {
  /**
   * Removes a value from the context.
   */
  delete(key: string): boolean;

  /**
   * Gets a value from the context by key.
   */
  get(key: string): unknown;

  /**
   * Checks if a key exists in the context.
   */
  has(key: string): boolean;

  /**
   * Initialize a new context scope with optional initial values.
   */
  initialize(initial?: Record<string, unknown>): ContextScopeInterface;

  /**
   * Checks if a context is currently active.
   */
  isActive(): boolean;

  /**
   * Gets all keys in the context.
   */
  keys(): string[];

  /**
   * Runs an operation in a fresh context scope and returns its result with the final snapshot.
   */
  run<TResult>(
    initial: Record<string, unknown>,
    operation: (scope: ContextScopeInterface) => Promise<TResult>
  ): Promise<ContextRunResultInterface<TResult>>;

  run<TResult>(
    initial: Record<string, unknown>,
    operation: (scope: ContextScopeInterface) => TResult
  ): ContextRunResultInterface<TResult>;

  /**
   * Sets a value in the context.
   */
  set(key: string, value: unknown): void;

  /**
   * Gets a shallow copy of all context data.
   */
  snapshot(): Record<string, unknown>;

  /**
   * Gets a presence-aware value from the context without throwing.
   *
   * Never throws — safe to call without checking isActive() first.
   */
  tryGet(key: string): ContextLookupEntity.Type;
}
