import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SystemConstructionError } from '../../src/errors/SystemConstructionError.js';
import { System } from '../../src/System.js';

void describe('System construction', () => {
  void it('rejects instantiation with a SystemConstructionError', () => {
    let thrown: unknown;
    try {
      const instance: unknown = Reflect.construct(System, []);
      assert.fail(`construction returned ${typeof instance}`);
    } catch (error: unknown) {
      thrown = error;
    }
    assert.ok(thrown instanceof SystemConstructionError);
    assert.equal(thrown.code, 'system.staticOnly');
  });
});
