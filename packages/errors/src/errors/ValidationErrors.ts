/** Iterable collection of validation violations with RFC 9457 Problem Details reporting. */

import { Predicates } from '@studnicky/types';

import type { ProblemDetailsEntity } from '../entities/ProblemDetailsEntity.js';
import type { ValidationAggregateViewEntity } from '../entities/ValidationAggregateViewEntity.js';
import type { ValidationReportOptionsEntity } from '../entities/ValidationReportOptionsEntity.js';
import type { ValidationViolationEntity } from '../entities/ValidationViolationEntity.js';

import {
  PROBLEM_TITLE_VALIDATION,
  PROBLEM_TYPE_VALIDATION
} from '../constants/ProblemConstants.js';
import { RuntimeError } from './RuntimeError.js';
import { ValidationError } from './ValidationError.js';



/** RFC 9457 3.1.3: the status an origin server would generate for a validation failure. */
const UNPROCESSABLE_ENTITY_STATUS = 422;

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
      throw RuntimeError.create('ValidationErrors.create() did not construct the requested subclass.');
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
    if (!Predicates.isArray(items)) {
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
      'keywords': [...keywordSet].toSorted(),
      'paths': [...pathSet].toSorted()
    };
    return result;
  }

  /**
   * RFC 9457 Problem Details payload for this collection.
   *
   * `type` and `title` describe the problem TYPE and are stable; `detail` counts THIS
   * occurrence's violations, per 3.1.4. The individual violations ride in the `errors`
   * extension member (3.2) rather than displacing any registered member.
   */
  public report(options?: ValidationReportOptionsEntity.Type): ProblemDetailsEntity.Type {
    const count = this.#items.length;
    const detail = count === 1 ? '1 validation error' : `${count} validation errors`;
    const result: ProblemDetailsEntity.Type = {
      'detail': detail,
      'errors': [...this.items],
      'status': options?.status ?? UNPROCESSABLE_ENTITY_STATUS,
      'title': options?.title ?? PROBLEM_TITLE_VALIDATION,
      'type': options?.type ?? PROBLEM_TYPE_VALIDATION
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
