import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResolveEntityReferenceType } from '../../../../src/types/references/ResolveEntityReferenceType.js';

declare module '../../../../src/interfaces/EntityReferenceRegistryInterface.js' {
  interface EntityReferenceRegistryInterface {
    'urn:test:Widget': { readonly 'id': string; readonly 'name': string };
  }
}

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

// POSITIVE: a registered $id derives its registered type, not unknown.
type WidgetType = ResolveEntityReferenceType<'urn:test:Widget'>;
type RegisteredCheck = ExpectTrueType<EqualType<WidgetType, { readonly 'id': string; readonly 'name': string }>>;

// NEGATIVE: an unregistered $id resolves to ReferenceNotFoundType, never a
// silent `unknown` — asserted by reading its named fields, which only exist
// on the diagnostic shape.
type MissingType = ResolveEntityReferenceType<'urn:test:Missing'>;
type UnresolvedKindCheck = ExpectTrueType<EqualType<MissingType['kind'], 'ReferenceNotFound'>>;
type UnresolvedRefCheck = ExpectTrueType<EqualType<MissingType['unresolvedReference'], 'urn:test:Missing'>>;

void describe('ResolveEntityReferenceType', () => {
  void it('type-checks the registered and unregistered paths above (enforced by tsc -b)', () => {
    const checks: [RegisteredCheck, UnresolvedKindCheck, UnresolvedRefCheck] = [true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
