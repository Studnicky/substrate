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

import { ErrorDefaults } from '../constants/index.js';
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

    const defaults = Reflect.get(ErrorDefaults, options.scenario);

    const mergedOptions: ModuleErrorOptionsInterface = {
      'cause': options.cause,
      'code': defaults.code,
      'context': options.context,
      'retryable': options.retryable ?? defaults.retryable,
      'status': options.status ?? defaults.status
    };

    const result = new ModuleError(message, mergedOptions);
    return result;
  }

  /**
   * Untyped context dictionary typed as `Record<string, unknown> | undefined`.
   *
   * Shadows `BaseError.metadata` for the `ModuleError` public API surface.
   */
  readonly #context: Record<string, unknown> | undefined;

  public get context(): Record<string, unknown> | undefined {
    const result: Record<string, unknown> | undefined = this.#context === undefined
      ? undefined
      : DefensiveSnapshot.record(this.#context);
    return result;
  }

  /**
   * Typed cause — narrows `Error.cause: unknown` to `Error | undefined`.
   */
  public override readonly cause: Error | undefined;

  /** HTTP status code (for API/HTTP errors). */

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
      'retryable': options.retryable ?? false,
      'status': options.status
    });

    this.cause = options.cause;
    this.#context = options.context === undefined
      ? undefined
      : DefensiveSnapshot.record(options.context);

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

    if (this.#context !== undefined) {
      extra.context = DefensiveSnapshot.record(this.#context);
    }

    return extra;
  }

}
