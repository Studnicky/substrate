/** Iterable collection of validation violations with RFC 7807 reporting. */

import type { ValidationAggregateViewType } from '../types/ValidationAggregateViewType.js';
import type { ValidationProblemDetailsType } from '../types/ValidationProblemDetailsType.js';
import type { ValidationReportOptionsType } from '../types/ValidationReportOptionsType.js';
import type { ValidationViolationType } from '../types/ValidationViolationType.js';

const DEFAULT_PROBLEM_TYPE = 'https://problems.studnicky.dev/validation';

/**
 * Ordered, iterable collection of `ValidationViolationType` items.
 *
 * NOT a thrown error — returned by validators. Use `ValidationError` for single-violation boundary exceptions.
 */
export class ValidationErrors implements Iterable<ValidationViolationType> {
  /** Creates a `ValidationErrors` from an array of violations. */
  public static of(violations: ValidationViolationType[]): ValidationErrors {
    const result = new ValidationErrors(violations);
    return result;
  }

  /** Merges multiple `ValidationErrors` collections into one. */
  public static merge(...errors: ValidationErrors[]): ValidationErrors {
    const violations = errors.flatMap((e) => {
      const items: ValidationViolationType[] = [...e.items];
      return items;
    });
    return new ValidationErrors(violations);
  }

  /** Maps Ajv-style validator errors into a `ValidationErrors` instance; empty when rawErrors is null/empty. */
  public static fromValidatorErrors(
    rawErrors:
      | { 'instancePath': string; 'keyword': string; 'message'?: string }[]
      | null
      | undefined
  ): ValidationErrors {
    if (rawErrors === null || rawErrors === undefined || rawErrors.length === 0) {
      return new ValidationErrors([]);
    }
    const violations: ValidationViolationType[] = rawErrors.map((raw) => {
      const violation: ValidationViolationType = {
        'keyword': raw.keyword,
        'message': raw.message ?? raw.keyword,
        'path': raw.instancePath
      };
      return violation;
    });
    return new ValidationErrors(violations);
  }

  /** The raw ordered list of validation violations. */
  public readonly items: readonly ValidationViolationType[];

  public constructor(items: readonly ValidationViolationType[]) {
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
      'errors': this.items,
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
