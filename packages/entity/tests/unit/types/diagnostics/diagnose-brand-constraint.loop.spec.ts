import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MinimumLengthBrandType } from '../../../../src/types/brands/MinimumLengthBrandType.js';
import type { DiagnoseBrandConstraintType } from '../../../../src/types/diagnostics/DiagnoseBrandConstraintType.js';
import type { AssertType, EqualType } from '../infer/type-level-assert.js';

void describe('DiagnoseBrandConstraintType', () => {
  void it('type-checks the sound and failing paths above (enforced by tsc -b)', () => {
    // Sound path: a value satisfying the brand passes through unchanged — no
    // diagnostic wrapper cost on the succeeding assignment's resolved type.
    // Failing path: an incompatible value resolves to a named diagnostic carrying
    // the constraint, expected param, offending value, and pointer — not `never`.
    const checks: [
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, MinimumLengthBrandType<5>, '/name'>, MinimumLengthBrandType<5>>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>['kind'], 'ConstraintViolation'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>['constraint'], 'minLength'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>['expected'], 5>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>['actual'], 'foo'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>['pointer'], '/name'>>
    ] = [true, true, true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
