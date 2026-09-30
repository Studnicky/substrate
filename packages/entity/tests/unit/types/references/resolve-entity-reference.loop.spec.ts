import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResolveEntityReferenceType } from '../../../../src/types/references/ResolveEntityReferenceType.js';
import type { AssertType, EqualType } from '../infer/type-level-assert.js';

void describe('ResolveEntityReferenceType', () => {
  void it('type-checks the registered and unregistered paths above (enforced by tsc -b)', () => {
    // POSITIVE: a registered $id derives its registered type, not unknown.
    // NEGATIVE: an unregistered $id resolves to ReferenceNotFoundType, never a
    // silent `unknown` — asserted by reading its named fields, which only exist
    // on the diagnostic shape.
    const checks: [
      AssertType<EqualType<ResolveEntityReferenceType<'urn:test:Widget'>, { readonly 'id': string; readonly 'name': string }>>,
      AssertType<EqualType<ResolveEntityReferenceType<'urn:test:Missing'>['kind'], 'ReferenceNotFound'>>,
      AssertType<EqualType<ResolveEntityReferenceType<'urn:test:Missing'>['unresolvedReference'], 'urn:test:Missing'>>
    ] = [true, true, true];

    assert.ok(checks.every(Boolean));
  });
});
