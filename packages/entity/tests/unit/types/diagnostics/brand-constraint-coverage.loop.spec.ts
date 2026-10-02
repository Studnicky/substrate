import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MaximumItemsBrandInterface, MaximumPropertiesBrandInterface } from '../../../../src/interfaces/index.js';
import type { MinimumBrandType } from '../../../../src/types/brands/MinimumBrandType.js';
import type { MinimumLengthBrandType } from '../../../../src/types/brands/MinimumLengthBrandType.js';
import type { PatternBrandType } from '../../../../src/types/brands/PatternBrandType.js';
import type { DiagnoseBrandConstraintType } from '../../../../src/types/diagnostics/DiagnoseBrandConstraintType.js';
import type { AssertType, EqualType } from '../infer/type-level-assert.js';

void describe('DiagnoseBrandConstraintType across carrier shapes', () => {
  void it('type-checks a failing diagnostic for each base carrier (enforced by tsc -b)', () => {
    // One representative brand per base carrier (string/number/array/object),
    // each on its failing path, proving the mechanism uniformly over every
    // constraint shape the brands cover — not just the one demonstrated in
    // diagnose-brand-constraint.loop.spec.ts.
    const checks: [
      AssertType<EqualType<DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>['constraint'], 'minLength'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'pattern', '^[a-z]+$', PatternBrandType<'^[a-z]+$'>, 'ABC', '/slug'>['constraint'], 'pattern'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'minimum', 1, MinimumBrandType<1>, 0, '/count'>['constraint'], 'minimum'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'maxItems', 5, MaximumItemsBrandInterface<5>, [], '/tags'>['constraint'], 'maxItems'>>,
      AssertType<EqualType<DiagnoseBrandConstraintType<'maxProperties', 3, MaximumPropertiesBrandInterface<3>, object, '/meta'>['constraint'], 'maxProperties'>>
    ] = [true, true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
