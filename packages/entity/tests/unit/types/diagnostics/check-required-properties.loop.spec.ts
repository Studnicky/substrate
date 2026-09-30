import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CheckRequiredPropertiesType } from '../../../../src/types/diagnostics/CheckRequiredPropertiesType.js';
import type { AssertType, EqualType } from '../infer/type-level-assert.js';

void describe('CheckRequiredPropertiesType', () => {
  void it('type-checks the sound and failing paths above (enforced by tsc -b)', () => {
    const checks: [
      AssertType<EqualType<CheckRequiredPropertiesType<['id'], { 'id': string }, '/user'>, never>>,
      AssertType<EqualType<CheckRequiredPropertiesType<['id', 'name'], { 'id': string }, '/user'>['kind'], 'MissingRequiredProperty'>>,
      AssertType<EqualType<CheckRequiredPropertiesType<['id', 'name'], { 'id': string }, '/user'>['property'], 'name'>>,
      AssertType<EqualType<CheckRequiredPropertiesType<['id', 'name'], { 'id': string }, '/user'>['pointer'], '/user'>>
    ] = [true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
