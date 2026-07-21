/** Iterable collection of validation violations with RFC 7807 reporting. */

import type { ValidationAggregateViewEntity } from '../entities/ValidationAggregateViewEntity.js';
import type { ValidationProblemDetailsEntity } from '../entities/ValidationProblemDetailsEntity.js';
import type { ValidationReportOptionsEntity } from '../entities/ValidationReportOptionsEntity.js';
import type { ValidationViolationEntity } from '../entities/ValidationViolationEntity.js';

import { ValidationError } from './ValidationError.js';

const DEFAULT_PROBLEM_TYPE = 'https://problems.studnicky.dev/validation';

/**
 * Ordered, iterable collection of `ValidationViolationEntity.Type` items.
 *
 * NOT a thrown error — returned by validators. Use `ValidationError` for single-violation boundary exceptions.
 *
 * Construct via `ValidationErrors.create(items)`.
 */
export class ValidationErrors implements Iterable<ValidationViolationEntity.Type> {
  /** Creates a `ValidationErrors` from an array of violations. */
  public static create(items: readonly ValidationViolationEntity.Type[]): ValidationErrors {
    const result = new this(items);
    return result;
  }

  /** Merges multiple `ValidationErrors` collections into one. */
  public static merge(...errors: ValidationErrors[]): ValidationErrors {
    const violations = errors.flatMap((e) => {
      const items: ValidationViolationEntity.Type[] = [...e.items];
      return items;
    });
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
    for (const item of this.#items) {
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
    for (const item of typedItems) {
      snapshot.push({ 'keyword': item.keyword, 'message': item.message, 'path': item.path });
    }
    this.#items = snapshot;
  }

  /** Compact rollup of deduplicated, sorted paths and keywords; safe for metric labels. */
  public aggregate(): ValidationAggregateViewEntity.Type {
    const pathSet = new Set<string>();
    const keywordSet = new Set<string>();
    for (const item of this.#items) {
      pathSet.add(item.path);
      keywordSet.add(item.keyword);
    }
    return {
      'count': this.#items.length,
      'keywords': [...keywordSet].sort(),
      'paths': [...pathSet].sort()
    };
  }

  /** RFC 7807 Problem Details payload; defaults: type validation URI, title 'Validation failed', status 422. */
  public report(options?: ValidationReportOptionsEntity.Type): ValidationProblemDetailsEntity.Type {
    const count = this.#items.length;
    const detail = count === 1 ? '1 validation error' : `${count} validation errors`;
    return {
      'detail': detail,
      'errors': [...this.items],
      'status': options?.status ?? 422,
      'title': options?.title ?? 'Validation failed',
      'type': options?.type ?? DEFAULT_PROBLEM_TYPE
    };
  }

  /** Number of violations in this collection. */
  public get length(): number {
    const result = this.#items.length;
    return result;
  }

  /** `true` when there are no violations. */
  public get ok(): boolean {
    return this.#items.length === 0;
  }

  public [Symbol.iterator](): Iterator<ValidationViolationEntity.Type> {
    const result = this.items[Symbol.iterator]();
    return result;
  }
}
