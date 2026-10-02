import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { ValidationViolationEntity } from '../../src/entities/ValidationViolationEntity.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ValidationErrors } from '../../src/errors/ValidationErrors.js';
import { ValidationErrorsScenarioCaseEntity } from './entities/ValidationErrorsScenarioCaseEntity.js';
import scenarioGroups from './validation-errors.scenarios.json' with { 'type': 'json' };

class TestViolation {
  public static of(path: string, keyword: string, message: string): ValidationViolationEntity.Type {
    const result = ValidationViolationEntity.create({ 'keyword': keyword, 'message': message, 'path': path });
    return result;
  }
}

/** Turns the JSON fixture tokens (`{ shape: 'undefined' | 'null' | 'empty-array' }`) into the values they stand for. */
class FixtureValues {
  public static materialize(value: unknown): unknown {
    if (Array.isArray(value)) {
      const items = value.map((entry: unknown) => {
        const materialized = FixtureValues.materialize(entry);
        return materialized;
      });
      return items;
    }
    if (Predicates.isRecord(value)) {
      const materialized = FixtureValues.materializeRecord(value);
      return materialized;
    }
    return value;
  }

  public static toViolations(input: unknown): ValidationViolationEntity.Type[] {
    if (!Array.isArray(input)) {
      throw RuntimeError.create('test fixture must contain a validation-violation array');
    }
    const violations: ValidationViolationEntity.Type[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const entry: unknown = input[index];
      if (!Predicates.isRecord(entry)) {
        throw RuntimeError.create('test fixture validation violation must be an object');
      }
      violations.push(ValidationViolationEntity.create({
        'keyword': String(entry.keyword),
        'message': String(entry.message),
        'path': String(entry.path)
      }));
    }
    return violations;
  }

  public static toAjvErrors(value: unknown): { 'instancePath': string; 'keyword': string; 'message'?: string }[] {
    if (!Predicates.isArray(value)) {
      throw RuntimeError.create('test fixture must be an ajv error array');
    }
    const errors: { 'instancePath': string; 'keyword': string; 'message'?: string }[] = [];
    for (let index = 0; index < value.length; index += 1) {
      errors.push(FixtureValues.toAjvError(value[index]));
    }
    return errors;
  }

  public static toEmptyOrValidatorErrors(value: unknown): { 'instancePath': string; 'keyword': string; 'message'?: string }[] | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    if (Predicates.isArray(value) && value.length === 0) {
      return [];
    }
    throw RuntimeError.create('test fixture must be null, undefined, or an empty array');
  }

  public static toOptionsAndViolations(value: unknown): { 'options': unknown; 'violations': ValidationViolationEntity.Type[] } {
    const record = ScenarioValues.requireRecord(value, 'test fixture (options/violations)');
    const result = { 'options': record.options, 'violations': FixtureValues.toViolations(record.violations) };
    return result;
  }

  public static toLeftRight(value: unknown): { 'left': ValidationViolationEntity.Type[]; 'right': ValidationViolationEntity.Type[] } {
    const record = ScenarioValues.requireRecord(value, 'test fixture (left/right)');
    const result = { 'left': FixtureValues.toViolations(record.left), 'right': FixtureValues.toViolations(record.right) };
    return result;
  }

  private static materializeRecord(record: Record<string, unknown>): unknown {
    if (record.shape === 'undefined') {
      return undefined;
    }
    if (record.shape === 'null') {
      return null;
    }
    if (record.shape === 'empty-array') {
      return [];
    }
    const structure = FixtureValues.materializeStructure(record);
    return structure;
  }

  private static materializeStructure(record: Record<string, unknown>): unknown {
    if ('violations' in record) {
      return {
        'options': FixtureValues.materialize(record.options),
        'violations': FixtureValues.materialize(record.violations)
      };
    }
    if ('left' in record || 'right' in record) {
      return {
        'left': FixtureValues.materialize(record.left),
        'right': FixtureValues.materialize(record.right)
      };
    }
    if ('instancePath' in record) {
      return {
        'instancePath': String(record.instancePath),
        'keyword': String(record.keyword),
        ...(record.message === undefined ? {} : { 'message': FixtureValues.materialize(record.message) })
      };
    }
    return record;
  }

  private static toAjvError(entry: unknown): { 'instancePath': string; 'keyword': string; 'message'?: string } {
    const record = ScenarioValues.requireRecord(entry, 'test fixture ajv error');
    const instancePath = ScenarioValues.requireString(record.instancePath, 'test fixture ajv error instancePath');
    const keyword = ScenarioValues.requireString(record.keyword, 'test fixture ajv error keyword');
    const message = record.message;
    if (message !== undefined && typeof message !== 'string') {
      throw RuntimeError.create('test fixture ajv error message must be a string when present');
    }
    const result = message === undefined ? { 'instancePath': instancePath, 'keyword': keyword } : { 'instancePath': instancePath, 'keyword': keyword, 'message': message };
    return result;
  }
}

class ValidationErrorsRunners {
  static 'aggregate-dedup'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'aggregate-dedup'>): void {
    ValidationErrorsRunners.assertAggregate(scenarioCase);
  }

  static 'aggregate-empty'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'aggregate-empty'>): void {
    ValidationErrorsRunners.assertAggregate(scenarioCase);
  }

  static 'construction-empty'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'construction-empty'>): void {
    ValidationErrorsRunners.assertConstruction(scenarioCase);
  }

  static 'construction-invalid'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'construction-invalid'>): void {
    const input = FixtureValues.materialize(scenarioCase.input);
    assert.throws(() => {
      ValidationErrors.create(input);
    });
  }

  static 'construction-non-empty'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'construction-non-empty'>): void {
    ValidationErrorsRunners.assertConstruction(scenarioCase);
  }

  static 'create-from-array'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'create-from-array'>): void {
    const source = FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input));
    const errors = ValidationErrors.create(source);
    assert.strictEqual(errors.length, scenarioCase.expected.length);
    assert.deepStrictEqual(errors.items, scenarioCase.expected.items ?? []);
  }

  static 'detaches-source'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'detaches-source'>): void {
    const source = FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input));
    const errors = ValidationErrors.create(source);

    ScenarioValues.requireDefined(source[0], 'Scenario source violation').message = 'mutated source';
    source.push(TestViolation.of('/name', 'required', 'required'));
    assert.strictEqual(errors.length, scenarioCase.expected.length);
    assert.deepStrictEqual(errors.items, scenarioCase.expected.items ?? []);

    const items = errors.items;
    if (items[0] !== undefined) {
      items[0].message = 'mutated projection';
    }
    assert.deepStrictEqual(errors.items, scenarioCase.expected.items ?? []);

    const report = errors.report();
    // Every Problem Details member is optional per RFC 9457 3.1, so the extension is narrowed.
    const reportErrors = ScenarioValues.requireDefined(report.errors, 'Report errors');
    if (reportErrors[0] !== undefined) {
      reportErrors[0].message = 'mutated report';
    }
    assert.deepStrictEqual(errors.items, scenarioCase.expected.items ?? []);

    const iterated = [...errors];
    if (iterated[0] !== undefined) {
      iterated[0].message = 'mutated iterator';
    }
    assert.deepStrictEqual(errors.items, scenarioCase.expected.items ?? []);
  }

  static 'fallback-message'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'fallback-message'>): void {
    ValidationErrorsRunners.assertValidatorErrorsMapped(scenarioCase);
  }

  static 'for-of'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'for-of'>): void {
    const violations = FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input));
    const expectedItems = scenarioCase.expected.items ?? [];
    let position = 0;
    for (const violation of ValidationErrors.create(violations)) {
      assert.deepStrictEqual(violation, expectedItems[position]);
      position += 1;
    }
    assert.strictEqual(position, expectedItems.length);
  }

  static 'from-empty-array'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'from-empty-array'>): void {
    ValidationErrorsRunners.assertValidatorErrorsEmpty(scenarioCase);
  }

  static 'from-null'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'from-null'>): void {
    ValidationErrorsRunners.assertValidatorErrorsEmpty(scenarioCase);
  }

  static 'from-undefined'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'from-undefined'>): void {
    ValidationErrorsRunners.assertValidatorErrorsEmpty(scenarioCase);
  }

  static 'maps-ajv'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'maps-ajv'>): void {
    ValidationErrorsRunners.assertValidatorErrorsMapped(scenarioCase);
  }

  static 'merge'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'merge'>): void {
    const { left, right } = FixtureValues.toLeftRight(FixtureValues.materialize(scenarioCase.input));
    const merged = ValidationErrors.merge(ValidationErrors.create(left), ValidationErrors.create(right));
    assert.strictEqual(merged.length, scenarioCase.expected.length);
    assert.deepStrictEqual(merged.items, scenarioCase.expected.items ?? []);
  }

  static 'merge-empty'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'merge-empty'>): void {
    const { left, right } = FixtureValues.toLeftRight(FixtureValues.materialize(scenarioCase.input));
    const merged = ValidationErrors.merge(ValidationErrors.create(left), ValidationErrors.create(right));
    assert.strictEqual(merged.ok, scenarioCase.expected.ok);
    assert.strictEqual(merged.length, scenarioCase.expected.length);
  }

  static 'report-default'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'report-default'>): void {
    ValidationErrorsRunners.assertDefaultReport(scenarioCase);
  }

  static 'report-empty'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'report-empty'>): void {
    ValidationErrorsRunners.assertDefaultReport(scenarioCase);
  }

  static 'report-invalid-status'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'report-invalid-status'>): void {
    const { options, violations } = FixtureValues.toOptionsAndViolations(FixtureValues.materialize(scenarioCase.input));
    assert.throws(() => {
      ValidationErrors.create(violations).report(options);
    });
  }

  static 'report-overrides'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'report-overrides'>): void {
    ValidationErrorsRunners.assertReportOverrides(scenarioCase);
  }

  static 'report-plural'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'report-plural'>): void {
    ValidationErrorsRunners.assertDefaultReport(scenarioCase);
  }

  static 'report-title'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'report-title'>): void {
    ValidationErrorsRunners.assertReportOverrides(scenarioCase);
  }

  static 'spread'(scenarioCase: ScenarioCaseOfType<ValidationErrorsScenarioCaseEntity.Type, 'spread'>): void {
    const violations = FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input));
    const spread = [...ValidationErrors.create(violations)];
    assert.strictEqual(spread.length, scenarioCase.expected.length);
    assert.deepStrictEqual(spread, scenarioCase.expected.items ?? []);
  }

  private static assertAggregate(scenarioCase: ValidationErrorsScenarioCaseEntity.Type): void {
    const aggregate = ValidationErrors.create(FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input))).aggregate();
    assert.deepStrictEqual(aggregate, scenarioCase.expected.aggregate);
  }

  private static assertConstruction(scenarioCase: ValidationErrorsScenarioCaseEntity.Type): void {
    const errors = ValidationErrors.create(FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input)));
    assert.strictEqual(errors.ok, scenarioCase.expected.ok);
    assert.strictEqual(errors.length, scenarioCase.expected.length);
  }

  private static assertDefaultReport(scenarioCase: ValidationErrorsScenarioCaseEntity.Type): void {
    const report = ValidationErrors.create(FixtureValues.toViolations(FixtureValues.materialize(scenarioCase.input))).report();
    assert.deepStrictEqual(report, scenarioCase.expected.report);
  }

  private static assertReportOverrides(scenarioCase: ValidationErrorsScenarioCaseEntity.Type): void {
    const { options, violations } = FixtureValues.toOptionsAndViolations(FixtureValues.materialize(scenarioCase.input));
    const report = ValidationErrors.create(violations).report(options);
    assert.deepStrictEqual(report, scenarioCase.expected.report);
  }

  private static assertValidatorErrorsEmpty(scenarioCase: ValidationErrorsScenarioCaseEntity.Type): void {
    const errors = ValidationErrors.fromValidatorErrors(FixtureValues.toEmptyOrValidatorErrors(FixtureValues.materialize(scenarioCase.input)));
    assert.strictEqual(errors.ok, scenarioCase.expected.ok);
    assert.strictEqual(errors.length, scenarioCase.expected.length);
  }

  private static assertValidatorErrorsMapped(scenarioCase: ValidationErrorsScenarioCaseEntity.Type): void {
    const errors = ValidationErrors.fromValidatorErrors(FixtureValues.toAjvErrors(FixtureValues.materialize(scenarioCase.input)));
    assert.strictEqual(errors.length, scenarioCase.expected.length);
    assert.deepStrictEqual(errors.items, scenarioCase.expected.items ?? []);
  }
}

ScenarioSuite.register({
  'entity': ValidationErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ValidationErrors',
  'runners': ValidationErrorsRunners
});
