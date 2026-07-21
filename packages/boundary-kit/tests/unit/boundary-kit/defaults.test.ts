/**
 * Default-construction tests — BoundaryKit.create() with no config
 */

import { equal } from 'node:assert/strict';
import { it } from 'node:test';

import { BoundaryKit } from '../../../src/index.js';

void it('produces a working, callable instance with real default primitives against a flaky function', async () => {
  const kit = BoundaryKit.create();

  let callCount = 0;

  const flaky = async (): Promise<string> => {
    callCount += 1;

    if (callCount <= 2) {
      throw new Error('transient failure');
    }

    return 'ok';
  };

  const result = await kit.execute(flaky);

  equal(result, 'ok');
  equal(callCount, 3);
});
