/**
 * ValidationErrors Unit Tests
 */

import {
  deepStrictEqual,
  ok,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { ValidationErrors } from '../../src/errors/ValidationErrors.js';
import type { ValidationViolationType } from '../../src/types/ValidationViolationType.js';

class TestViolation {
  public static of(path: string, keyword: string, message: string): ValidationViolationType {
    return { keyword, message, path };
  }
}

void describe('ValidationErrors', () => {
  void describe('construction', () => {
    void it('empty collection has ok === true and length === 0', () => {
      const errs = new ValidationErrors([]);
      ok(errs.ok);
      strictEqual(errs.length, 0);
    });

    void it('non-empty collection has ok === false', () => {
      const errs = new ValidationErrors([TestViolation.of('/name', 'required', 'required')]);
      strictEqual(errs.ok, false);
      strictEqual(errs.length, 1);
    });
  });

  void describe('ValidationErrors.of()', () => {
    void it('produces correct collection from array', () => {
      const v = TestViolation.of('/email', 'format', 'must be email');
      const errs = ValidationErrors.of([v]);
      strictEqual(errs.length, 1);
      strictEqual(errs.items[0], v);
    });
  });

  void describe('ValidationErrors.merge()', () => {
    void it('combines violations from multiple collections', () => {
      const a = ValidationErrors.of([TestViolation.of('/a', 'required', 'required')]);
      const b = ValidationErrors.of([TestViolation.of('/b', 'minLength', 'too short')]);
      const merged = ValidationErrors.merge(a, b);
      strictEqual(merged.length, 2);
      strictEqual(merged.items[0]?.path, '/a');
      strictEqual(merged.items[1]?.path, '/b');
    });

    void it('merging empty collections yields empty', () => {
      const merged = ValidationErrors.merge(new ValidationErrors([]), new ValidationErrors([]));
      ok(merged.ok);
    });
  });

  void describe('ValidationErrors.fromValidatorErrors()', () => {
    const emptyInputScenarios: Array<{ description: string; input: null | undefined | never[] }> = [
      { description: 'returns empty collection for null', input: null },
      { description: 'returns empty collection for undefined', input: undefined },
      { description: 'returns empty collection for empty array', input: [] }
    ];

    for (const { description, input } of emptyInputScenarios) {
      void it(description, () => {
        const errs = ValidationErrors.fromValidatorErrors(input);
        ok(errs.ok);
      });
    }

    void it('maps Ajv-style errors to violations', () => {
      const rawErrors = [
        { instancePath: '/name', keyword: 'required', message: 'must have property name' },
        { instancePath: '/email', keyword: 'format', message: 'must match format "email"' }
      ];
      const errs = ValidationErrors.fromValidatorErrors(rawErrors);
      strictEqual(errs.length, 2);
      strictEqual(errs.items[0]?.path, '/name');
      strictEqual(errs.items[0]?.keyword, 'required');
      strictEqual(errs.items[0]?.message, 'must have property name');
      strictEqual(errs.items[1]?.path, '/email');
    });

    void it('falls back to keyword as message when message is absent', () => {
      const rawErrors = [{ instancePath: '/x', keyword: 'type', message: undefined }];
      const errs = ValidationErrors.fromValidatorErrors(rawErrors);
      strictEqual(errs.items[0]?.message, 'type');
    });
  });

  void describe('aggregate()', () => {
    void it('returns deduplicated sorted paths and keywords', () => {
      const errs = ValidationErrors.of([
        TestViolation.of('/b', 'minLength', 'too short'),
        TestViolation.of('/a', 'required', 'required'),
        TestViolation.of('/b', 'type', 'wrong type'),
        TestViolation.of('/a', 'required', 'required again')
      ]);
      const agg = errs.aggregate();
      strictEqual(agg.count, 4);
      deepStrictEqual(agg.paths, ['/a', '/b']);
      deepStrictEqual(agg.keywords, ['minLength', 'required', 'type']);
    });

    void it('returns empty arrays for empty collection', () => {
      const agg = new ValidationErrors([]).aggregate();
      strictEqual(agg.count, 0);
      deepStrictEqual(agg.paths, []);
      deepStrictEqual(agg.keywords, []);
    });
  });

  void describe('report()', () => {
    void it('returns RFC 7807 shape with defaults', () => {
      const errs = ValidationErrors.of([TestViolation.of('/x', 'required', 'required')]);
      const report = errs.report();
      strictEqual(report.type, 'https://problems.studnicky.dev/validation');
      strictEqual(report.title, 'Validation failed');
      strictEqual(report.status, 422);
      strictEqual(report.detail, '1 validation error');
      strictEqual(report.errors.length, 1);
    });

    void it('uses plural detail for multiple errors', () => {
      const errs = ValidationErrors.of([
        TestViolation.of('/a', 'required', 'required'),
        TestViolation.of('/b', 'format', 'bad format')
      ]);
      strictEqual(errs.report().detail, '2 validation errors');
    });

    void it('applies provided type and status overrides', () => {
      const errs = ValidationErrors.of([TestViolation.of('/x', 'required', 'required')]);
      const report = errs.report({ type: 'https://example.com/custom', status: 400 });
      strictEqual(report.type, 'https://example.com/custom');
      strictEqual(report.status, 400);
      strictEqual(report.title, 'Validation failed');
    });

    void it('applies provided title override', () => {
      const errs = ValidationErrors.of([TestViolation.of('/x', 'required', 'required')]);
      const report = errs.report({ title: 'Schema check failed' });
      strictEqual(report.title, 'Schema check failed');
    });
  });

  void describe('iterable', () => {
    void it('spread yields all violations', () => {
      const v1 = TestViolation.of('/a', 'required', 'required');
      const v2 = TestViolation.of('/b', 'minLength', 'too short');
      const errs = ValidationErrors.of([v1, v2]);
      const spread = [...errs];
      strictEqual(spread.length, 2);
      strictEqual(spread[0], v1);
      strictEqual(spread[1], v2);
    });

    void it('for-of iterates violations in order', () => {
      const violations = [
        TestViolation.of('/a', 'required', 'required'),
        TestViolation.of('/b', 'format', 'bad format'),
        TestViolation.of('/c', 'type', 'wrong type')
      ];
      const errs = ValidationErrors.of(violations);
      const collected: ValidationViolationType[] = [];
      for (const v of errs) {
        collected.push(v);
      }
      deepStrictEqual(collected, violations);
    });
  });
});
