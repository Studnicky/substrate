import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Context as NodeContext } from '../../../src/node/index.js';
import { Context as BrowserContext } from '../../../src/browser/index.js';

describe('Context node-first runtime entrypoint', () => {
  it('retains Node storage after the browser entrypoint loads', async () => {
    assert.notStrictEqual(NodeContext, BrowserContext);

    const context = NodeContext.create({ 'name': 'node-first' });
    const scope = context.initialize({ 'value': 'node' });

    const value = await scope.execute(async () => {
      await Promise.resolve();
      return context.get('value');
    });

    assert.strictEqual(value, 'node');
  });
});
