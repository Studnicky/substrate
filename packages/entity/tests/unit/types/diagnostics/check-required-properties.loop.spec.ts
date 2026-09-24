import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CheckRequiredPropertiesType } from '../../../../src/types/diagnostics/CheckRequiredPropertiesType.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

type Properties = { 'id': string };

type SoundResult = CheckRequiredPropertiesType<['id'], Properties, '/user'>;
type SoundCheck = ExpectTrueType<EqualType<SoundResult, never>>;

type FailingResult = CheckRequiredPropertiesType<['id', 'name'], Properties, '/user'>;
type FailingKindCheck = ExpectTrueType<EqualType<FailingResult['kind'], 'MissingRequiredProperty'>>;
type FailingPropertyCheck = ExpectTrueType<EqualType<FailingResult['property'], 'name'>>;
type FailingPointerCheck = ExpectTrueType<EqualType<FailingResult['pointer'], '/user'>>;

void describe('CheckRequiredPropertiesType', () => {
  void it('type-checks the sound and failing paths above (enforced by tsc -b)', () => {
    const checks: [SoundCheck, FailingKindCheck, FailingPropertyCheck, FailingPointerCheck] = [true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
