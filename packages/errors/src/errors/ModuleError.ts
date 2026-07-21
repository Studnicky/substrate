/**
 * Base error class for all modules in the monorepo.
 *
 * Extends `BaseError` with scenario-driven defaults, HTTP status codes,
 * and cause-chain traversal helpers.
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
 * import type { ModuleErrorOptionsInterface } from '@studnicky/errors';
 * import { ErrorDefaults } from '@studnicky/errors';
 *
 * export class GraphStoreError extends ModuleError {
 *   static override create(
 *     message: string,
 *     options?: Omit<ModuleErrorCreateOptionsInterface, 'scenario'>
 *   ): GraphStoreError {
 *     const defaults = ErrorDefaults.DATABASE;
 *     const mergedOptions: ModuleErrorOptionsInterface = {
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
  ModuleErrorCreateOptionsInterface,
  ModuleErrorInterface,
  ModuleErrorOptionsInterface
} from '../interfaces/index.js';

import {
  CAUSE_CHAIN_DEPTH_LIMIT,
  CAUSE_DEPTH_SENTINEL,
  ErrorDefaults
} from '../constants/index.js';
import { DefensiveSnapshot } from '../validation/DefensiveSnapshot.js';
import { BaseError } from './BaseError.js';
import { ValidationError } from './ValidationError.js';

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
  static create(message: string, options: ModuleErrorCreateOptionsInterface): ModuleError {
    if (!(options.scenario in ErrorDefaults)) {
      throw ValidationError.create({
        'message': `Must be one of: ${Object.keys(ErrorDefaults).join(', ')}`,
        'path': 'scenario',
        'violations': [
          {
            'message': `Invalid error scenario: ${String(options.scenario)}`,
            'path': 'scenario'
          }
        ]
      });
    }

    const defaults = ErrorDefaults[options.scenario];

    const mergedOptions: ModuleErrorOptionsInterface = {
      'cause': options.cause,
      'code': defaults.code,
      'context': options.context,
      'retryable': options.retryable ?? defaults.retryable,
      'statusCode': options.statusCode ?? defaults.statusCode
    };

    return new ModuleError(message, mergedOptions);
  }

  /**
   * Untyped context dictionary typed as `Record<string, unknown> | undefined`.
   *
   * Shadows `BaseError.metadata` for the `ModuleError` public API surface.
   */
  readonly #context: Record<string, unknown> | undefined;

  public get context(): Record<string, unknown> | undefined {
    return this.#context === undefined
      ? undefined
      : DefensiveSnapshot.record(this.#context);
  }

  /**
   * Typed cause — narrows `Error.cause: unknown` to `Error | undefined`.
   */
  public override readonly cause: Error | undefined;

  /** HTTP status code (for API/HTTP errors). */
  public readonly statusCode: number | undefined;

  /**
   * Protected constructor — use `ModuleError.create()` instead.
   * Subclasses can call this constructor directly in their own `create()` methods.
   */
  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    if (typeof message !== 'string' || message.length === 0) {
      throw ValidationError.create({
        'message': 'Must be a non-empty string',
        'path': 'message'
      });
    }

    if (typeof options.code !== 'string' || options.code.length === 0) {
      throw ValidationError.create({
        'message': 'Must be a non-empty string',
        'path': 'code'
      });
    }

    super({
      'cause': options.cause,
      'code': options.code,
      'message': message,
      'retryable': options.retryable ?? false
    });

    this.cause = options.cause;
    this.statusCode = options.statusCode;
    this.#context = options.context === undefined
      ? undefined
      : DefensiveSnapshot.record(options.context);

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
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
    const extra: Record<string, unknown> = {};
    return extra;
  }

  /**
   * Builds the ModuleError-format JSON object for this node at the given
   * cause-chain depth. Recursion into a `ModuleError` cause is bounded by
   * `CAUSE_CHAIN_DEPTH_LIMIT` — the same limit and `CAUSE_DEPTH_SENTINEL`
   * sentinel `BaseError.serializeCause()` uses — so a long wrap chain or a
   * circular `cause` reference cannot overflow the stack.
   *
   * Fire-point: called from `toJSON()` with `depth = 0`, and recursively for
   * each `ModuleError` cause encountered.
   */
  private serializeModuleNode(depth: number): Record<string, unknown> {
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

    if (this.#context !== undefined) {
      json.context = DefensiveSnapshot.record(this.#context);
    }

    const cause = this.cause;
    if (cause !== undefined) {
      if (cause instanceof ModuleError) {
        json.cause = depth >= CAUSE_CHAIN_DEPTH_LIMIT
          ? CAUSE_DEPTH_SENTINEL
          : cause.serializeModuleNode(depth + 1);
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

    return json;
  }

  /**
   * Serializes this error for structured logging.
   * Builds the depth-limited ModuleError-format JSON object, then merges
   * `serializeExtra()` so subclasses can inject additional fields without
   * rewriting cause-chain logic.
   */
  override toJSON(): Record<string, unknown> {
    const json = this.serializeModuleNode(0);
    return { ...json, ...this.serializeExtra() };
  }
}
