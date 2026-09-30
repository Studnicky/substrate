import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SystemConstructionError } from '../../src/errors/SystemConstructionError.js';
import { System } from '../../src/System.js';

void describe('System construction', () => {
  void it('rejects instantiation with a SystemConstructionError', () => {
    assert.throws(() => {
      Reflect.construct(System, []);
    }, (error: unknown) => {
      assert.ok(error instanceof SystemConstructionError);
      assert.equal(error.code, 'system.staticOnly');
      return true;
    });
  });
});
