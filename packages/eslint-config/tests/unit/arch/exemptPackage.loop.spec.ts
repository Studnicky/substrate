import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ExemptPackage } from '../../../src/rules/arch/ExemptPackage.js';

// Covered here rather than through a rule scenario: `intake-parse-only` now resolves parameter
// types through the TypeScript checker, so its RuleTester needs a real program, and a synthetic
// filename like `/repo/packages/types/src/Guard.ts` cannot be resolved by the project service.
// The matcher is a pure function, so testing it directly is both possible and clearer.
void describe('ExemptPackage', () => {
  void it('matches a file inside an exempt package', () => {
    assert.equal(ExemptPackage.matches('/repo/packages/types/src/Guard.ts', ['@studnicky/types']), true);
  });

  void it('does not match a file outside every exempt package', () => {
    assert.equal(ExemptPackage.matches('/repo/packages/records/src/Handler.ts', ['@studnicky/types']), false);
  });

  void it('matches a project-service relative filename', () => {
    assert.equal(ExemptPackage.matches('types/src/Guard.ts', ['@studnicky/types']), true);
  });

  void it('does not match when the exempt list is empty', () => {
    assert.equal(ExemptPackage.matches('/repo/packages/types/src/Guard.ts', []), false);
  });
});
