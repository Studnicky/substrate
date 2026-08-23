/** Iterable collection of validation violations with RFC 7807 reporting. */

import type { ValidationAggregateViewEntity } from '../entities/ValidationAggregateViewEntity.js';
import type { ValidationProblemDetailsEntity } from '../entities/ValidationProblemDetailsEntity.js';
import type { ValidationReportOptionsEntity } from '../entities/ValidationReportOptionsEntity.js';
import type { ValidationViolationEntity } from '../entities/ValidationViolationEntity.js';

import { ValidationError } from './ValidationError.js';

const DEFAULT_PROBLEM_TYPE = 'https://problems.studnicky.dev/validation';

interface ValidationErrorsSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class ValidationErrorsInstance {
  static belongsTo<TInstance>(
    constructor: ValidationErrorsSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * Ordered, iterable collection of `ValidationViolationEntity.Type` items.
 *
 * NOT a thrown error — returned by validators. Use `ValidationError` for single-violation boundary exceptions.
 *
 * Construct via `ValidationErrors.create(items)`.
 */
export class ValidationErrors implements Iterable<ValidationViolationEntity.Type> {
  /** Creates a `ValidationErrors` from an array of violations (or the subclass instance when called on a subclass). */
  public static create<TInstance extends ValidationErrors = ValidationErrors>(
    this: ValidationErrorsSubclassInterface<TInstance>,
    items: readonly ValidationViolationEntity.Type[]
  ): TInstance {
    const result: unknown = Reflect.construct(this, [items]);
    if (!ValidationErrorsInstance.belongsTo(this, result)) {
      throw new TypeError('ValidationErrors.create() did not construct the requested subclass.');
    }
    return result;
  }

  /** Merges multiple `ValidationErrors` collections into one. */
  public static merge(...errors: ValidationErrors[]): ValidationErrors {
    const violations: ValidationViolationEntity.Type[] = [];
    const errorCount = errors.length;
    for (let errorIndex = 0; errorIndex < errorCount; errorIndex += 1) {
      const error = errors[errorIndex];
      if (error === undefined) {
        continue;
      }
      const items = error.items;
      const itemCount = items.length;
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const item = items[itemIndex];
        if (item !== undefined) {
          violations.push(item);
        }
      }
    }
    const result = ValidationErrors.create(violations);
    return result;
  }

  /** Maps Ajv-style validator errors into a `ValidationErrors` instance; empty when rawErrors is null/empty. */
  public static fromValidatorErrors(
    rawErrors:
      | { 'instancePath': string; 'keyword': string; 'message'?: string }[]
      | null
      | undefined
  ): ValidationErrors {
    if (rawErrors === null || rawErrors === undefined || rawErrors.length === 0) {
      const result = ValidationErrors.create([]);
      return result;
    }
    const violations: ValidationViolationEntity.Type[] = rawErrors.map((raw) => {
      const violation: ValidationViolationEntity.Type = {
        'keyword': raw.keyword,
        'message': raw.message ?? raw.keyword,
        'path': raw.instancePath
      };
      return violation;
    });
    const result = ValidationErrors.create(violations);
    return result;
  }

  readonly #items: readonly Readonly<ValidationViolationEntity.Type>[];

  /** Detached ordered validation violations. */
  public get items(): readonly ValidationViolationEntity.Type[] {
    const result: ValidationViolationEntity.Type[] = [];
    const length = this.#items.length;
    for (let index = 0; index < length; index += 1) {
      const item = this.#items[index];
      if (item === undefined) {
        continue;
      }
      result.push({ 'keyword': item.keyword, 'message': item.message, 'path': item.path });
    }
    return result;
  }

  protected constructor(items: readonly ValidationViolationEntity.Type[]) {
    const typedItems = items;
    if (!Array.isArray(items)) {
      throw ValidationError.create({ 'message': 'items must be an array', 'path': 'items' });
    }
    const snapshot: ValidationViolationEntity.Type[] = [];
    const length = typedItems.length;
    for (let index = 0; index < length; index += 1) {
      const item = typedItems[index];
      if (item === undefined) {
        continue;
      }
      snapshot.push({ 'keyword': item.keyword, 'message': item.message, 'path': item.path });
    }
    this.#items = snapshot;
  }

  /** Compact rollup of deduplicated, sorted paths and keywords; safe for metric labels. */
  public aggregate(): ValidationAggregateViewEntity.Type {
    const pathSet = new Set<string>();
    const keywordSet = new Set<string>();
    const length = this.#items.length;
    for (let index = 0; index < length; index += 1) {
      const item = this.#items[index];
      if (item === undefined) {
        continue;
      }
      pathSet.add(item.path);
      keywordSet.add(item.keyword);
    }
    const result: ValidationAggregateViewEntity.Type = {
      'count': this.#items.length,
      'keywords': [...keywordSet].sort(),
      'paths': [...pathSet].sort()
    };
    return result;
  }

  /** RFC 7807 Problem Details payload; defaults: type validation URI, title 'Validation failed', status 422. */
  public report(options?: ValidationReportOptionsEntity.Type): ValidationProblemDetailsEntity.Type {
    const count = this.#items.length;
    const detail = count === 1 ? '1 validation error' : `${count} validation errors`;
    const result: ValidationProblemDetailsEntity.Type = {
      'detail': detail,
      'errors': [...this.items],
      'status': options?.status ?? 422,
      'title': options?.title ?? 'Validation failed',
      'type': options?.type ?? DEFAULT_PROBLEM_TYPE
    };
    return result;
  }

  /** Number of violations in this collection. */
  public get length(): number {
    const result = this.#items.length;
    return result;
  }

  /** `true` when there are no violations. */
  public get ok(): boolean {
    const result = this.#items.length === 0;
    return result;
  }

  public [Symbol.iterator](): Iterator<ValidationViolationEntity.Type> {
    const items = this.items;
    const result = items[Symbol.iterator]();
    return result;
  }
}
