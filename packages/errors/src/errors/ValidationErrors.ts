/** Iterable collection of validation violations with RFC 7807 reporting. */

import type { ValidationAggregateViewType } from '../types/ValidationAggregateViewType.js';
import type { ValidationProblemDetailsType } from '../types/ValidationProblemDetailsType.js';
import type { ValidationReportOptionsType } from '../types/ValidationReportOptionsType.js';
import type { ValidationViolationType } from '../types/ValidationViolationType.js';

import { ValidationError } from './ValidationError.js';
import { ValidationErrorsBuilder } from './ValidationErrorsBuilder.js';

const DEFAULT_PROBLEM_TYPE = 'https://problems.studnicky.dev/validation';

/**
 * Ordered, iterable collection of `ValidationViolationType` items.
 *
 * NOT a thrown error — returned by validators. Use `ValidationError` for single-violation boundary exceptions.
 *
 * Construct via `ValidationErrors.create(items)` or `ValidationErrors.builder().addViolation(v).build()`.
 */
export class ValidationErrors implements Iterable<ValidationViolationType> {
  /** Creates a `ValidationErrors` from an array of violations. */
  public static create(items: readonly ValidationViolationType[]): ValidationErrors {
    const result = new this(items);
    return result;
  }

  /** Returns a fluent builder for assembling a `ValidationErrors` incrementally. */
  public static builder(): ValidationErrorsBuilder {
    const result = ValidationErrorsBuilder.create((items) => {
      const instance = ValidationErrors.create(items);
      return instance;
    });
    return result;
  }

  /** Creates a `ValidationErrors` from an array of violations. */
  public static of(violations: ValidationViolationType[]): ValidationErrors {
    const result = ValidationErrors.create(violations);
    return result;
  }

  /** Merges multiple `ValidationErrors` collections into one. */
  public static merge(...errors: ValidationErrors[]): ValidationErrors {
    const violations = errors.flatMap((e) => {
      const items: ValidationViolationType[] = [...e.items];
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
    const violations: ValidationViolationType[] = rawErrors.map((raw) => {
      const violation: ValidationViolationType = {
        'keyword': raw.keyword,
        'message': raw.message ?? raw.keyword,
        'path': raw.instancePath
      };
      return violation;
    });
    const result = ValidationErrors.create(violations);
    return result;
  }

  /** The raw ordered list of validation violations. */
  public readonly items: readonly ValidationViolationType[];

  protected constructor(items: readonly ValidationViolationType[]) {
    if (!Array.isArray(items)) {
      throw ValidationError.create({ 'message': 'items must be an array', 'path': 'items' });
    }
    this.items = items;
  }

  /** Compact rollup of deduplicated, sorted paths and keywords; safe for metric labels. */
  public aggregate(): ValidationAggregateViewType {
    const pathSet = new Set<string>();
    const keywordSet = new Set<string>();
    for (const item of this.items) {
      pathSet.add(item.path);
      keywordSet.add(item.keyword);
    }
    return {
      'count': this.items.length,
      'keywords': [...keywordSet].sort(),
      'paths': [...pathSet].sort()
    };
  }

  /** RFC 7807 Problem Details payload; defaults: type validation URI, title 'Validation failed', status 422. */
  public report(options?: ValidationReportOptionsType): ValidationProblemDetailsType {
    const count = this.items.length;
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
    const result = this.items.length;
    return result;
  }

  /** `true` when there are no violations. */
  public get ok(): boolean {
    return this.items.length === 0;
  }

  public [Symbol.iterator](): Iterator<ValidationViolationType> {
    const result = this.items[Symbol.iterator]();
    return result;
  }
}
