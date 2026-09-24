import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MinimumLengthBrandType } from '../../../../src/types/brands/MinimumLengthBrandType.js';
import type { DiagnoseBrandConstraintType } from '../../../../src/types/diagnostics/DiagnoseBrandConstraintType.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

// Sound path: a value satisfying the brand passes through unchanged — no
// diagnostic wrapper cost on the succeeding assignment's resolved type.
type SoundResult = DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, MinimumLengthBrandType<5>, '/name'>;
type SoundCheck = ExpectTrueType<EqualType<SoundResult, MinimumLengthBrandType<5>>>;

// Failing path: an incompatible value resolves to a named diagnostic carrying
// the constraint, expected param, offending value, and pointer — not `never`.
type FailingResult = DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>;
type FailingKindCheck = ExpectTrueType<EqualType<FailingResult['kind'], 'ConstraintViolation'>>;
type FailingConstraintCheck = ExpectTrueType<EqualType<FailingResult['constraint'], 'minLength'>>;
type FailingExpectedCheck = ExpectTrueType<EqualType<FailingResult['expected'], 5>>;
type FailingActualCheck = ExpectTrueType<EqualType<FailingResult['actual'], 'foo'>>;
type FailingPointerCheck = ExpectTrueType<EqualType<FailingResult['pointer'], '/name'>>;

void describe('DiagnoseBrandConstraintType', () => {
  void it('type-checks the sound and failing paths above (enforced by tsc -b)', () => {
    const checks: [SoundCheck, FailingKindCheck, FailingConstraintCheck, FailingExpectedCheck, FailingActualCheck, FailingPointerCheck]
      = [true, true, true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
