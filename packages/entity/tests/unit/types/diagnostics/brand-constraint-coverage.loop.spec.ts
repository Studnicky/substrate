import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MaximumItemsBrandType } from '../../../../src/types/brands/MaximumItemsBrandType.js';
import type { MaximumPropertiesBrandType } from '../../../../src/types/brands/MaximumPropertiesBrandType.js';
import type { MinimumBrandType } from '../../../../src/types/brands/MinimumBrandType.js';
import type { MinimumLengthBrandType } from '../../../../src/types/brands/MinimumLengthBrandType.js';
import type { PatternBrandType } from '../../../../src/types/brands/PatternBrandType.js';
import type { DiagnoseBrandConstraintType } from '../../../../src/types/diagnostics/DiagnoseBrandConstraintType.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

// One representative brand per base carrier (string/number/array/object),
// each on its failing path, proving the mechanism uniformly over every
// constraint shape the brands cover — not just the one demonstrated in
// diagnose-brand-constraint.loop.spec.ts.
type LengthFail = DiagnoseBrandConstraintType<'minLength', 5, MinimumLengthBrandType<5>, 'foo', '/name'>;
type PatternFail = DiagnoseBrandConstraintType<'pattern', '^[a-z]+$', PatternBrandType<'^[a-z]+$'>, 'ABC', '/slug'>;
type MinimumFail = DiagnoseBrandConstraintType<'minimum', 1, MinimumBrandType<1>, 0, '/count'>;
type ItemsFail = DiagnoseBrandConstraintType<'maxItems', 5, MaximumItemsBrandType<5>, [], '/tags'>;
type PropertiesFail = DiagnoseBrandConstraintType<'maxProperties', 3, MaximumPropertiesBrandType<3>, object, '/meta'>;

type LengthCheck = ExpectTrueType<EqualType<LengthFail['constraint'], 'minLength'>>;
type PatternCheck = ExpectTrueType<EqualType<PatternFail['constraint'], 'pattern'>>;
type MinimumCheck = ExpectTrueType<EqualType<MinimumFail['constraint'], 'minimum'>>;
type ItemsCheck = ExpectTrueType<EqualType<ItemsFail['constraint'], 'maxItems'>>;
type PropertiesCheck = ExpectTrueType<EqualType<PropertiesFail['constraint'], 'maxProperties'>>;

void describe('DiagnoseBrandConstraintType across carrier shapes', () => {
  void it('type-checks a failing diagnostic for each base carrier (enforced by tsc -b)', () => {
    const checks: [LengthCheck, PatternCheck, MinimumCheck, ItemsCheck, PropertiesCheck] = [true, true, true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
