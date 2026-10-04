import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CheckAdditionalPropertiesType } from '../../../../src/types/diagnostics/CheckAdditionalPropertiesType.js';
import type { AssertType, EqualType } from '../infer/type-level-assert.js';

void describe('CheckAdditionalPropertiesType', () => {
  void it('type-checks the sound and failing paths above (enforced by tsc -b)', () => {
    const checks: [
      AssertType<EqualType<CheckAdditionalPropertiesType<{ 'id': string }, { 'id': string }, '/user'>, never>>,
      AssertType<EqualType<CheckAdditionalPropertiesType<{ 'id': string }, { 'extra': number; 'id': string }, '/user'>['kind'], 'ExcessProperty'>>,
      AssertType<EqualType<CheckAdditionalPropertiesType<{ 'id': string }, { 'extra': number; 'id': string }, '/user'>['property'], 'extra'>>,
      AssertType<EqualType<CheckAdditionalPropertiesType<{ 'id': string }, { 'extra': number; 'id': string }, '/user'>['pointer'], '/user'>>
    ] = [true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
