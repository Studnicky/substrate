import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SchemaIntakeError } from '@studnicky/entity/node';
import { DateRangeBoundEntity } from '../../../src/DateRangeBoundEntity.js';
import { DateRangeEntity } from '../../../src/DateRangeEntity.js';
import { FilterValueEntity } from '../../../src/FilterValueEntity.js';
import { GroupGateNamesEntity } from '../../../src/GroupGateNamesEntity.js';
import { NumericRangeEntity } from '../../../src/NumericRangeEntity.js';
import { TimeRangeEntity } from '../../../src/TimeRangeEntity.js';

describe('filter entities', () => {
  it('accepts scalar, array, and object filter values', () => {
    assert.equal(FilterValueEntity.intake('active'), 'active');
    assert.deepEqual(FilterValueEntity.intake(['active', 2, false]), ['active', 2, false]);
    assert.deepEqual(FilterValueEntity.intake({ 'meta': { 'enabled': true } }), { 'meta': { 'enabled': true } });
    assert.equal(DateRangeBoundEntity.intake('2020-01-01T00:00:00.000Z'), '2020-01-01T00:00:00.000Z');
    assert.equal(DateRangeBoundEntity.intake(1_700_000_000_000), 1_700_000_000_000);
  });

  it('accepts declarative numeric, date, and time ranges', () => {
    assert.deepEqual(
      NumericRangeEntity.intake({ 'inclusive': false, 'maximum': 10, 'minimum': 1 }),
      { 'inclusive': false, 'maximum': 10, 'minimum': 1 }
    );
    assert.deepEqual(
      DateRangeEntity.intake({ 'maximum': '2025-12-31T23:59:59.999Z', 'minimum': 1_700_000_000_000 }),
      { 'maximum': '2025-12-31T23:59:59.999Z', 'minimum': 1_700_000_000_000 }
    );
    assert.deepEqual(
      NumericRangeEntity.create({ 'maximum': 10, 'minimum': 1 }),
      { 'maximum': 10, 'minimum': 1 }
    );
    assert.deepEqual(
      TimeRangeEntity.intake({ 'maximum': '17:00:00', 'minimum': '09:00:00' }),
      { 'maximum': '17:00:00', 'minimum': '09:00:00' }
    );
  });

  it('preserves range boundary order', () => {
    assert.deepEqual(
      NumericRangeEntity.intake({ 'maximum': 1, 'minimum': 10 }),
      { 'maximum': 1, 'minimum': 10 }
    );
  });

  it('rejects incomplete, incorrectly typed, and unknown range members', () => {
    assert.throws(() => NumericRangeEntity.intake({ 'maximum': 10, 'minimum': '1' }), SchemaIntakeError);
    assert.throws(() => DateRangeEntity.intake({ 'maximum': new Date(), 'minimum': '2025-01-01T00:00:00.000Z' }), SchemaIntakeError);
    assert.throws(() => DateRangeEntity.intake({ 'minimum': '2025-01-01T00:00:00.000Z' }), SchemaIntakeError);
    assert.throws(() => TimeRangeEntity.intake({ 'maximum': 17, 'minimum': '09:00' }), SchemaIntakeError);
    assert.throws(() => TimeRangeEntity.intake({ 'maximum': '17:00', 'minimum': '09:00', 'timezone': 'UTC' }), SchemaIntakeError);
  });

  it('accepts a group-gate name array', () => {
    assert.deepEqual(GroupGateNamesEntity.intake(['CORE.EVERY', 'custom:SOME']), ['CORE.EVERY', 'custom:SOME']);
  });

  it('rejects invalid values as SchemaIntakeError', () => {
    assert.throws(
      () => FilterValueEntity.intake({ 'invalid': undefined }),
      SchemaIntakeError
    );
    assert.throws(() => FilterValueEntity.intake(/value/u), SchemaIntakeError);
    assert.throws(() => DateRangeBoundEntity.intake(new Date()), SchemaIntakeError);
    assert.throws(
      () => GroupGateNamesEntity.intake({ 'gate': 'CORE.EVERY' }),
      SchemaIntakeError
    );
  });

  it('rejects native runtime operands at the configuration boundary', () => {
    assert.throws(() => FilterValueEntity.intake(new Date()), SchemaIntakeError);
    assert.throws(() => FilterValueEntity.intake(new Map()), SchemaIntakeError);
    assert.throws(() => FilterValueEntity.intake(new Set()), SchemaIntakeError);
  });

  it('rejects cyclic input as SchemaIntakeError', () => {
    const filterValue: Record<string, unknown> = {};
    filterValue.self = filterValue;
    const groupGateNames: unknown[] = [];
    groupGateNames.push(groupGateNames);

    assert.throws(
      () => FilterValueEntity.intake(filterValue),
      SchemaIntakeError
    );
    assert.throws(
      () => GroupGateNamesEntity.intake(groupGateNames),
      SchemaIntakeError
    );
  });

  it('returns values detached from caller-owned input', () => {
    const filterValue = { 'meta': { 'enabled': true } };
    const groupGateNames = ['CORE.EVERY'];

    const parsedFilterValue = FilterValueEntity.intake(filterValue);
    const parsedGroupGateNames = GroupGateNamesEntity.intake(groupGateNames);
    filterValue.meta.enabled = false;
    groupGateNames.push('CORE.SOME');

    assert.deepEqual(parsedFilterValue, { 'meta': { 'enabled': true } });
    assert.deepEqual(parsedGroupGateNames, ['CORE.EVERY']);
  });
});
