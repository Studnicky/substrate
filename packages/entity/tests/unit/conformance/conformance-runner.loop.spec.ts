import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';
import type { ConformanceSuiteFileInterface } from '../../conformance/interfaces/ConformanceSuiteFileInterface.js';

import { ConformanceBaselineComparator } from '../../conformance/ConformanceBaselineComparator.js';
import { ConformanceError } from '../../conformance/ConformanceError.js';
import { ConformanceRunner } from '../../conformance/ConformanceRunner.js';

/** A minimal stand-in compiler exercising the same seam `EntityCompiler.compile` exposes. */
class FakeTypeCompiler {
  public static compile(schema: boolean | object): EntityValidateFunctionInterface<unknown> {
    const declaredType: unknown = typeof schema === 'boolean' ? undefined : Reflect.get(schema, 'type');
    const check = (data: unknown): data is unknown => {
      const matches = typeof data === declaredType;
      return matches;
    };
    const predicate = Object.assign(check, { 'errors': null });
    return predicate;
  }
}

class ThrowingCompiler {
  public static compile(): never {
    throw new ConformanceError('unsupported schema shape');
  }
}

void describe('ConformanceRunner', () => {
  void it('tallies passing and failing cases against a compile function', () => {
    const files: readonly ConformanceSuiteFileInterface[] = [{
      'groups': [{
        'description': 'string type',
        'schema': { 'type': 'string' },
        'tests': [
          { 'data': 'hello', 'description': 'a string is valid', 'valid': true },
          { 'data': 1, 'description': 'a number is invalid', 'valid': false },
          { 'data': 1, 'description': 'wrongly expects a number to pass', 'valid': true }
        ]
      }],
      'relativePath': 'fixture.json'
    }];

    const report = ConformanceRunner.run('fake', files, FakeTypeCompiler);

    assert.equal(report.total, 3);
    assert.equal(report.passed, 2);
    assert.equal(report.failed, 1);
    assert.equal(report.failures[0]?.caseDescription, 'wrongly expects a number to pass');
  });

  void it('records every case in a group as failed when the schema fails to compile', () => {
    const files: readonly ConformanceSuiteFileInterface[] = [{
      'groups': [{
        'description': 'unsupported',
        'schema': { 'type': 'string' },
        'tests': [
          { 'data': 'a', 'description': 'case one', 'valid': true },
          { 'data': 'b', 'description': 'case two', 'valid': true }
        ]
      }],
      'relativePath': 'fixture.json'
    }];

    const report = ConformanceRunner.run('fake', files, ThrowingCompiler);

    assert.equal(report.failed, 2);
    assert.ok(report.failures.every((failure) => {
      const matches = failure.reason.includes('unsupported schema shape');
      return matches;
    }));
  });
});

void describe('ConformanceBaselineComparator', () => {
  void it('flags an actual failure absent from the baseline as a regression', () => {
    const diff = ConformanceBaselineComparator.diff(
      [{ 'caseDescription': 'c', 'expectedValid': true, 'groupDescription': 'g', 'reason': 'boom', 'relativePath': 'a.json' }],
      []
    );

    assert.equal(diff.regressions.length, 1);
    assert.equal(diff.resolved.length, 0);
  });

  void it('flags a baseline entry that no longer fails as stale', () => {
    const diff = ConformanceBaselineComparator.diff(
      [],
      [{ 'caseDescription': 'c', 'groupDescription': 'g', 'relativePath': 'a.json' }]
    );

    assert.equal(diff.regressions.length, 0);
    assert.equal(diff.resolved.length, 1);
  });

  void it('reports no diff when the actual failure set matches the baseline exactly', () => {
    const entry = { 'caseDescription': 'c', 'groupDescription': 'g', 'relativePath': 'a.json' };
    const diff = ConformanceBaselineComparator.diff(
      [{ ...entry, 'expectedValid': true, 'reason': 'boom' }],
      [entry]
    );

    assert.equal(diff.regressions.length, 0);
    assert.equal(diff.resolved.length, 0);
  });
});
