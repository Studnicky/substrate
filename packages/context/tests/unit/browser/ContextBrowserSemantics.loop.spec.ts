import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as browserExports from '../../../src/browser/index.js';

void describe('Context browser semantics', () => {
  void it('keeps browser contexts explicit after the Node entrypoint loads', async () => {
    const context = browserExports.Context.create({ 'name': 'browser-first' });
    const scope = context.initialize({ 'value': 'browser' });

    await scope.execute(async () => {
      await Promise.resolve();
      assert.throws(() => {
        context.get('value');
      }, browserExports.ContextError);
    });
  });

});
