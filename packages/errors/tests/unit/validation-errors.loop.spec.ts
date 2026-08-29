import { RuntimeError } from '../../src/errors/RuntimeError.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidationErrors } from '../../src/errors/ValidationErrors.js';
import { ValidationViolationEntity } from '../../src/entities/ValidationViolationEntity.js';
import scenarioGroups from './validation-errors.scenarios.json' with { type: 'json' };

class TestViolation {
  public static of(path: string, keyword: string, message: string): ValidationViolationEntity.Type {
    return ValidationViolationEntity.create({ keyword, message, path });
  }
}

interface ScenarioRecordInterface {
  readonly [key: string]: ScenarioValue;
}

type ScenarioValue = undefined | boolean | number | string | null | ScenarioValue[] | ScenarioRecordInterface;

type ScenarioCase =
  | {
      description: string;
      expected: {
        aggregate?: {
          count: number;
          keywords: readonly string[];
          paths: readonly string[];
        };
        items?: readonly ValidationViolationEntity.Type[];
        length: number;
        ok?: boolean;
        report?: {
          detail?: string;
          errors?: readonly ValidationViolationEntity.Type[];
          status?: number;
          title?: string;
          type?: string;
        };
      };
      input: ScenarioValue;
      shape: 'aggregate-dedup' | 'aggregate-empty' | 'construction-empty' | 'construction-invalid' | 'construction-non-empty' | 'create-from-array' | 'detaches-source' | 'fallback-message' | 'for-of' | 'from-empty-array' | 'from-null' | 'from-undefined' | 'maps-ajv' | 'merge' | 'merge-empty' | 'report-default' | 'report-empty' | 'report-overrides' | 'report-plural' | 'report-title' | 'spread';
      name: string;
    };

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

type RunnerMap = Record<ScenarioCase['shape'], ScenarioRunner>;

function materialize(value: ScenarioValue): ScenarioValue | undefined {
  if (Array.isArray(value)) {
    return value.map((entry) => materialize(entry));
  }

  if (value !== null && typeof value === 'object' && 'shape' in value && value.shape === 'undefined') {
    return undefined;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as ScenarioRecordInterface;
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

function toViolations(input: ScenarioValue | undefined): ValidationViolationEntity.Type[] {
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
  const errs = ValidationErrors.fromValidatorErrors(input as null | undefined | []);
  assert.strictEqual(errs.ok, scenarioCase.expected.ok);
  assert.strictEqual(errs.length, scenarioCase.expected.length);
};

const runValidatorErrorsMapped: ScenarioRunner = (scenarioCase) => {
  const input = materialize(scenarioCase.input);
  const errs = ValidationErrors.fromValidatorErrors(input as { instancePath: string; keyword: string; message?: string }[]);
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
  const { options, violations } = input as { options: { status?: number; title?: string; type?: string }; violations: ValidationViolationEntity.Type[] };
  const report = ValidationErrors.create(violations).report(options);
  assert.deepStrictEqual(report, scenarioCase.expected.report);
};

const runnerMap: RunnerMap = {
  'aggregate-dedup': runAggregate,
  'aggregate-empty': runAggregate,
  'construction-empty': runConstruction,
  'construction-invalid': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    assert.throws(() => {
      ValidationErrors.create(input as never);
    }, (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('items must be an array'));
      return true;
    });
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
    const { left, right } = input as { left: ValidationViolationEntity.Type[]; right: ValidationViolationEntity.Type[] };
    const merged = ValidationErrors.merge(ValidationErrors.create(left), ValidationErrors.create(right));
    assert.strictEqual(merged.length, scenarioCase.expected.length);
    expectViolations(merged.items, scenarioCase.expected.items ?? []);
  },
  'merge-empty': (scenarioCase) => {
    const input = materialize(scenarioCase.input);
    const { left, right } = input as { left: ValidationViolationEntity.Type[]; right: ValidationViolationEntity.Type[] };
    const merged = ValidationErrors.merge(ValidationErrors.create(left), ValidationErrors.create(right));
    assert.strictEqual(merged.ok, scenarioCase.expected.ok);
    assert.strictEqual(merged.length, scenarioCase.expected.length);
  },
  'report-default': runDefaultReport,
  'report-empty': runDefaultReport,
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
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('ValidationErrors', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
