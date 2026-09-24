import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CheckAdditionalPropertiesType } from '../../../../src/types/diagnostics/CheckAdditionalPropertiesType.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

type Properties = { 'id': string };

type SoundResult = CheckAdditionalPropertiesType<Properties, { 'id': string }, '/user'>;
type SoundCheck = ExpectTrueType<EqualType<SoundResult, never>>;

type FailingResult = CheckAdditionalPropertiesType<Properties, { 'extra': number; 'id': string }, '/user'>;
type FailingKindCheck = ExpectTrueType<EqualType<FailingResult['kind'], 'ExcessProperty'>>;
type FailingPropertyCheck = ExpectTrueType<EqualType<FailingResult['property'], 'extra'>>;
type FailingPointerCheck = ExpectTrueType<EqualType<FailingResult['pointer'], '/user'>>;

void describe('CheckAdditionalPropertiesType', () => {
  void it('type-checks the sound and failing paths above (enforced by tsc -b)', () => {
    const checks: [SoundCheck, FailingKindCheck, FailingPropertyCheck, FailingPointerCheck] = [true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
