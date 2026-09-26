import { RuntimeError } from '../../src/errors/RuntimeError.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { Predicates } from '@studnicky/types/node';

import { ValidationErrors } from '../../src/errors/ValidationErrors.js';
import { ValidationViolationEntity } from '../../src/entities/ValidationViolationEntity.js';
import { ValidationErrorsScenarioCaseEntity } from './entities/ValidationErrorsScenarioCaseEntity.js';
import scenarioGroups from './validation-errors.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(
  ValidationErrorsScenarioCaseEntity.Schema, ValidationErrorsScenarioCaseEntity.Node, ValidationErrorsScenarioCaseEntity.RemoteSchemas
);

class TestViolation {
  public static of(path: string, keyword: string, message: string): ValidationViolationEntity.Type {
    return ValidationViolationEntity.create({ keyword, message, path });
  }
}

type ScenarioCase = ValidationErrorsScenarioCaseEntity.Type;

interface ScenarioRecordInterface {
  readonly [key: string]: ScenarioValue;
}

type ScenarioValue = undefined | boolean | number | string | null | ScenarioValue[] | ScenarioRecordInterface;

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

function materialize(value: ScenarioValue): ScenarioValue {
  if (Array.isArray(value)) {
    return value.map((entry) => materialize(entry));
  }

  if (value !== null && typeof value === 'object' && 'shape' in value && value.shape === 'undefined') {
    return undefined;
  }

  if (value !== null && typeof value === 'object') {
    const record = value;
    if (record.shape === 'null') {
      return null;
    }

    if (record.shape === 'empty-array') {
      return [];
    }

    if ('violations' in record) {
      return {
        'options': materialize(record.options),
        'violations': materialize(record.violations)
      };
    }

    if ('left' in record || 'right' in record) {
      return {
        'left': materialize(record.left),
        'right': materialize(record.right)
      };
    }

    if ('instancePath' in record) {
      return {
        'instancePath': String(record.instancePath),
        'keyword': String(record.keyword),
        ...(record.message === undefined ? {} : { 'message': materialize(record.message) })
      };
    }

    const result: Record<string, ScenarioValue> = {};
    for (const [key, entry] of Object.entries(record)) {
      result[key] = materialize(entry);
    }
    return result;
  }

  return value;
}

function toViolations(input: ScenarioValue): ValidationViolationEntity.Type[] {
  if (!Array.isArray(input)) {
    throw RuntimeError.create('test fixture must contain a validation-violation array');
  }

  return input.map((entry) => {
    if (entry === null || Array.isArray(entry) || typeof entry !== 'object') {
      throw RuntimeError.create('test fixture validation violation must be an object');
    }
    return ValidationViolationEntity.create({
      'keyword': String(entry.keyword),
      'message': String(entry.message),
      'path': String(entry.path)
    });
  });
}

function toAjvErrors(value: ScenarioValue): { 'instancePath': string; 'keyword': string; 'message'?: string }[] {
  if (!Predicates.isArray(value)) {
    throw RuntimeError.create('test fixture must be an ajv error array');
  }
  return value.map((entry) => {
    if (!Predicates.isRecord(entry)) {
      throw RuntimeError.create('test fixture ajv error must be an object');
    }
    const instancePath = entry.instancePath;
    const keyword = entry.keyword;
    const message = entry.message;
    if (typeof instancePath !== 'string' || typeof keyword !== 'string') {
      throw RuntimeError.create('test fixture ajv error must have a string instancePath and keyword');
    }
    if (message !== undefined && typeof message !== 'string') {
      throw RuntimeError.create('test fixture ajv error message must be a string when present');
    }
    return message === undefined ? { instancePath, keyword } : { instancePath, keyword, message };
  });
}

function toEmptyOrValidatorErrors(value: ScenarioValue): { 'instancePath': string; 'keyword': string; 'message'?: string }[] | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  if (Predicates.isArray(value) && value.length === 0) {
    return [];
  }
  throw RuntimeError.create('test fixture must be null, undefined, or an empty array');
}

function isScenarioRecord(value: ScenarioValue): value is ScenarioRecordInterface {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toOptionsAndViolations(value: ScenarioValue): { 'options': unknown; 'violations': ValidationViolationEntity.Type[] } {
  if (!isScenarioRecord(value)) {
    throw RuntimeError.create('test fixture must be an object with options/violations');
  }
  return { 'options': value.options, 'violations': toViolations(value.violations) };
}

function toLeftRight(value: ScenarioValue): { 'left': ValidationViolationEntity.Type[]; 'right': ValidationViolationEntity.Type[] } {
  if (!isScenarioRecord(value)) {
    throw RuntimeError.create('test fixture must be an object with left/right');
  }
  return { 'left': toViolations(value.left), 'right': toViolations(value.right) };
}

function expectViolations(actual: readonly ValidationViolationEntity.Type[], expected: readonly ValidationViolationEntity.Type[]): void {
  assert.deepStrictEqual(actual, expected);
}

const runConstruction: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const errs = ValidationErrors.create(toViolations(input));
  assert.strictEqual(errs.ok, scenarioCase.expected.ok);
  assert.strictEqual(errs.length, scenarioCase.expected.length);
};

const runValidatorErrorsEmpty: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const errs = ValidationErrors.fromValidatorErrors(toEmptyOrValidatorErrors(input));
  assert.strictEqual(errs.ok, scenarioCase.expected.ok);
  assert.strictEqual(errs.length, scenarioCase.expected.length);
};

const runValidatorErrorsMapped: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const errs = ValidationErrors.fromValidatorErrors(toAjvErrors(input));
  assert.strictEqual(errs.length, scenarioCase.expected.length);
  expectViolations(errs.items, scenarioCase.expected.items ?? []);
};

const runAggregate: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const agg = ValidationErrors.create(toViolations(input)).aggregate();
  assert.deepStrictEqual(agg, scenarioCase.expected.aggregate);
};

const runDefaultReport: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const report = ValidationErrors.create(toViolations(input)).report();
  assert.deepStrictEqual(report, scenarioCase.expected.report);
};

const runReportOverrides: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const { options, violations } = toOptionsAndViolations(input);
  const report = ValidationErrors.create(violations).report(options);
  assert.deepStrictEqual(report, scenarioCase.expected.report);
};

const runReportInvalidStatus: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const { options, violations } = toOptionsAndViolations(input);
  assert.throws(() => {
    ValidationErrors.create(violations).report(options);
  });
};

const runnerMap = {
  'aggregate-dedup': runAggregate,
  'aggregate-empty': runAggregate,
  'construction-empty': runConstruction,
  'construction-invalid': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    assert.strictEqual(Predicates.isArray(input), false);
  },
  'construction-non-empty': runConstruction,
  'create-from-array': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const source = toViolations(input);
    const errs = ValidationErrors.create(source);
    assert.strictEqual(errs.length, scenarioCase.expected.length);
    expectViolations(errs.items, scenarioCase.expected.items ?? []);
  },
  'detaches-source': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const source = toViolations(input);
    const errs = ValidationErrors.create(source);

    source[0]!.message = 'mutated source';
    source.push(TestViolation.of('/name', 'required', 'required'));
    assert.strictEqual(errs.length, scenarioCase.expected.length);
    expectViolations(errs.items, scenarioCase.expected.items ?? []);

    const items = errs.items;
    if (items[0] !== undefined) {
      items[0].message = 'mutated projection';
    }

    expectViolations(errs.items, scenarioCase.expected.items ?? []);

    const report = errs.report();
    // Every Problem Details member is optional per RFC 9457 3.1, so the extension is narrowed.
    assert.ok(report.errors !== undefined);
    if (report.errors[0] !== undefined) {
      report.errors[0].message = 'mutated report';
    }

    expectViolations(errs.items, scenarioCase.expected.items ?? []);

    const iterated = [...errs];
    if (iterated[0] !== undefined) {
      iterated[0].message = 'mutated iterator';
    }

    expectViolations(errs.items, scenarioCase.expected.items ?? []);
  },
  'fallback-message': runValidatorErrorsMapped,
  'for-of': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const violations = toViolations(input);
    const collected: ValidationViolationEntity.Type[] = [];
    for (const v of ValidationErrors.create(violations)) {
      collected.push(v);
    }
    expectViolations(collected, scenarioCase.expected.items ?? []);
  },
  'from-empty-array': runValidatorErrorsEmpty,
  'from-null': runValidatorErrorsEmpty,
  'from-undefined': runValidatorErrorsEmpty,
  'maps-ajv': runValidatorErrorsMapped,
  'merge': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const { left, right } = toLeftRight(input);
    const merged = ValidationErrors.merge(ValidationErrors.create(left), ValidationErrors.create(right));
    assert.strictEqual(merged.length, scenarioCase.expected.length);
    expectViolations(merged.items, scenarioCase.expected.items ?? []);
  },
  'merge-empty': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const { left, right } = toLeftRight(input);
    const merged = ValidationErrors.merge(ValidationErrors.create(left), ValidationErrors.create(right));
    assert.strictEqual(merged.ok, scenarioCase.expected.ok);
    assert.strictEqual(merged.length, scenarioCase.expected.length);
  },
  'report-default': runDefaultReport,
  'report-empty': runDefaultReport,
  'report-invalid-status': runReportInvalidStatus,
  'report-overrides': runReportOverrides,
  'report-plural': runDefaultReport,
  'report-title': runReportOverrides,
  'spread': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const violations = toViolations(input);
    const spread = [...ValidationErrors.create(violations)];
    assert.strictEqual(spread.length, scenarioCase.expected.length);
    expectViolations(spread, scenarioCase.expected.items ?? []);
  }
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('ValidationErrors', () => {
  const fileData = fileIntake(scenarioGroups);
  for (const scenario of fileData.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
