import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConformanceBaselineComparator } from '../../conformance/ConformanceBaselineComparator.js';
import type { ConformanceCompileFunctionInterface } from '../../conformance/interfaces/ConformanceCompileFunctionInterface.js';
import type { ConformanceSuiteFileInterface } from '../../conformance/interfaces/ConformanceSuiteFileInterface.js';
import { ConformanceRunner } from '../../conformance/ConformanceRunner.js';

/** A minimal stand-in compiler exercising the same seam `EntityCompiler.compile` exposes. */
const fakeTypeCompile: ConformanceCompileFunctionInterface = <TValidated>(schema: boolean | object) => {
  const declaredType: unknown = Reflect.get(schema, 'type');
  const check = (data: unknown): data is TValidated => typeof data === declaredType;
  const predicate = Object.assign(check, { 'errors': null });
  return predicate;
};

const throwingCompile: ConformanceCompileFunctionInterface = () => {
  throw new Error('unsupported schema shape');
};

void describe('ConformanceRunner', () => {
  void it('tallies passing and failing cases against a compile function', () => {
    const files: readonly ConformanceSuiteFileInterface[] = [{
      'relativePath': 'fixture.json',
      'groups': [{
        'description': 'string type',
        'schema': { 'type': 'string' },
        'tests': [
          { 'description': 'a string is valid', 'data': 'hello', 'valid': true },
          { 'description': 'a number is invalid', 'data': 1, 'valid': false },
          { 'description': 'wrongly expects a number to pass', 'data': 1, 'valid': true }
        ]
      }]
    }];

    const report = ConformanceRunner.run('fake', files, fakeTypeCompile);

    assert.equal(report.total, 3);
    assert.equal(report.passed, 2);
    assert.equal(report.failed, 1);
    assert.equal(report.failures[0]?.caseDescription, 'wrongly expects a number to pass');
  });

  void it('records every case in a group as failed when the schema fails to compile', () => {
    const files: readonly ConformanceSuiteFileInterface[] = [{
      'relativePath': 'fixture.json',
      'groups': [{
        'description': 'unsupported',
        'schema': { 'type': 'string' },
        'tests': [
          { 'description': 'case one', 'data': 'a', 'valid': true },
          { 'description': 'case two', 'data': 'b', 'valid': true }
        ]
      }]
    }];

    const report = ConformanceRunner.run('fake', files, throwingCompile);

    assert.equal(report.failed, 2);
    assert.ok(report.failures.every((failure) => failure.reason.includes('unsupported schema shape')));
  });
});

void describe('ConformanceBaselineComparator', () => {
  void it('flags an actual failure absent from the baseline as a regression', () => {
    const diff = ConformanceBaselineComparator.diff(
      [{ 'relativePath': 'a.json', 'groupDescription': 'g', 'caseDescription': 'c', 'expectedValid': true, 'reason': 'boom' }],
      []
    );

    assert.equal(diff.regressions.length, 1);
    assert.equal(diff.resolved.length, 0);
  });

  void it('flags a baseline entry that no longer fails as stale', () => {
    const diff = ConformanceBaselineComparator.diff(
      [],
      [{ 'relativePath': 'a.json', 'groupDescription': 'g', 'caseDescription': 'c' }]
    );

    assert.equal(diff.regressions.length, 0);
    assert.equal(diff.resolved.length, 1);
  });

  void it('reports no diff when the actual failure set matches the baseline exactly', () => {
    const entry = { 'relativePath': 'a.json', 'groupDescription': 'g', 'caseDescription': 'c' };
    const diff = ConformanceBaselineComparator.diff(
      [{ ...entry, 'expectedValid': true, 'reason': 'boom' }],
      [entry]
    );

    assert.equal(diff.regressions.length, 0);
    assert.equal(diff.resolved.length, 0);
  });
});
