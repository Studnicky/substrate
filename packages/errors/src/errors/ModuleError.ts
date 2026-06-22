/**
 * Base error class for all modules in the monorepo.
 *
 * Extends `BaseError` with scenario-driven defaults, HTTP status codes,
 * and cause-chain traversal helpers. Existing subclasses continue to work
 * without modification.
 *
 * @example Using scenario defaults
 * ```typescript
 * const error = ModuleError.create('Database connection failed', {
 *   scenario: 'CONNECTION',
 *   context: { host: 'db.example.com', port: 5432 },
 *   cause: originalError
 * });
 * ```
 *
 * @example Extending for domain-specific errors
 * ```typescript
 * import { ModuleError } from '@studnicky/errors';
 * import type { ModuleErrorOptionsType } from '@studnicky/errors';
 * import { ErrorDefaults } from '@studnicky/errors';
 *
 * export class GraphStoreError extends ModuleError {
 *   static override create(
 *     message: string,
 *     options?: Omit<ModuleErrorCreateOptionsType, 'scenario'>
 *   ): GraphStoreError {
 *     const defaults = ErrorDefaults.DATABASE;
 *     const mergedOptions: ModuleErrorOptionsType = {
 *       cause: options?.cause,
 *       code: defaults.code,
 *       context: options?.context,
 *       retryable: options?.retryable ?? defaults.retryable,
 *       statusCode: options?.statusCode ?? defaults.statusCode
 *     };
 *     return new GraphStoreError(message, mergedOptions);
 *   }
 * }
 * ```
 */
import type {
  ModuleErrorCreateOptionsType,
  ModuleErrorInterface,
  ModuleErrorOptionsType
} from '../interfaces/index.js';

import { ErrorDefaults } from '../constants/index.js';
import { BaseError } from './BaseError.js';

/**
 * Base error for all modules. Extends `BaseError` while preserving the
 * scenario-defaults API and `context: Record<string, unknown> | undefined`
 * typing from the original implementation.
 */
export class ModuleError extends BaseError implements ModuleErrorInterface {
  /**
   * Create a new ModuleError with scenario defaults.
   *
   * Merges user options over the specified scenario defaults from `ErrorDefaults`.
   * User-provided options take precedence over scenario defaults.
   */
  static create(message: string, options: ModuleErrorCreateOptionsType): ModuleError {
    if (!(options.scenario in ErrorDefaults)) {
      throw new TypeError(`Invalid error scenario: ${String(options.scenario)}. Must be one of: ${Object.keys(ErrorDefaults).join(', ')}`);
    }

    const defaults = ErrorDefaults[options.scenario];

    const mergedOptions: ModuleErrorOptionsType = {
      'cause': options.cause,
      'code': defaults.code,
      'context': options.context,
      'retryable': options.retryable ?? defaults.retryable,
      'statusCode': options.statusCode ?? defaults.statusCode
    };

    return new ModuleError(message, mergedOptions);
  }

  /**
   * Untyped context dictionary — preserved as `Record<string, unknown> | undefined`
   * for backward compatibility with existing dependents.
   *
   * Shadows `BaseError.metadata` for the `ModuleError` public API surface.
   */
  public readonly context: Record<string, unknown> | undefined;

  /**
   * Typed cause — narrows `Error.cause: unknown` to `Error | undefined`.
   * Preserved for backward API compatibility.
   */
  public override readonly cause: Error | undefined;

  /** HTTP status code (for API/HTTP errors). */
  public readonly statusCode: number | undefined;

  /**
   * Protected constructor — use `ModuleError.create()` instead.
   * Subclasses can call this constructor directly in their own `create()` methods.
   */
  protected constructor(message: string, options: ModuleErrorOptionsType) {
    if (typeof message !== 'string' || message.length === 0) {
      throw new TypeError('ModuleError message must be a non-empty string');
    }

    if (typeof options.code !== 'string' || options.code.length === 0) {
      throw new TypeError('ModuleError code must be a non-empty string');
    }

    super({
      'cause': options.cause,
      'code': options.code,
      'message': message,
      'retryable': options.retryable ?? false
    });

    this.cause = options.cause;
    this.statusCode = options.statusCode;
    this.context = options.context;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Walks the cause chain starting at `this`, returning all `Error` nodes.
   * Subclasses may override to alter traversal behavior.
   */
  protected walkCauseChain(): Error[] {
    const chain: Error[] = [this];
    let current: unknown = this.cause;

    while (current instanceof Error) {
      chain.push(current);
      current = (current as { 'cause'?: unknown }).cause;
    }

    return chain;
  }

  /**
   * Returns extra serialized fields to merge into the `toJSON()` output.
   * Override in subclasses to inject additional fields; call `super.serializeExtra()`
   * to preserve the standard ModuleError fields.
   *
   * Fire-point: called from `toJSON()`.
   * Default returns `{}`.
   */
  protected override serializeExtra(): Record<string, unknown> {
    return {};
  }

  /**
   * Finds the first cause of a specific type in the chain.
   */
  findCauseOfType<T extends Error>(errorType: new (...args: never[]) => T): T | undefined {
    const result = this.walkCauseChain().find((error): error is T => error instanceof errorType);
    return result;
  }

  /**
   * Returns the full error chain including all causes.
   */
  getCauseChain(): Error[] {
    return this.walkCauseChain();
  }

  /**
   * Returns `true` if this error or any cause is an instance of `errorType`.
   */
  hasCauseOfType(errorType: new (...args: never[]) => Error): boolean {
    const result = this.walkCauseChain().some((error) => error instanceof errorType);
    return result;
  }

  /**
   * Serializes this error for structured logging.
   * Builds the ModuleError-format JSON object, then merges `serializeExtra()`
   * so subclasses can inject additional fields without rewriting cause-chain logic.
   */
  override toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      'code': this.code,
      'message': this.message,
      'name': this.name,
      'retryable': this.retryable,
      'stack': this.stack
    };

    if (this.statusCode !== undefined) {
      json.statusCode = this.statusCode;
    }

    if (this.context !== undefined) {
      json.context = this.context;
    }

    const cause = this.cause;
    if (cause !== undefined) {
      if (cause instanceof ModuleError) {
        json.cause = cause.toJSON();
      } else if (cause instanceof Error) {
        json.cause = {
          'message': cause.message,
          'name': cause.name,
          'stack': cause.stack
        };
      } else {
        json.cause = cause;
      }
    }

    return { ...json, ...this.serializeExtra() };
  }
}
