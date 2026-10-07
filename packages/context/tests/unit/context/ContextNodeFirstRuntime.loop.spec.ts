import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as nodeRuntime from '../../../src/node/index.js';

void describe('Context node-first runtime entrypoint', () => {
  void it('retains Node storage after the browser entrypoint loads', async () => {
    const context = nodeRuntime.Context.create({ 'name': 'node-first' });
    const scope = context.initialize({ 'value': 'node' });

    const value = await scope.execute(async () => {
      await Promise.resolve();
      const storedValue = context.get('value');
      return storedValue;
    });

    assert.strictEqual(value, 'node');
  });
});
