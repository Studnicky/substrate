import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NodeOwnerToken } from '../../../../src/file-lock/browser/NodeOwnerToken.js';

void describe('browser NodeOwnerToken', () => {
  void it('returns one stable token per instance so lock and rename paths agree', () => {
    const token = new NodeOwnerToken();

    assert.equal(token.get(), token.get());
  });

  void it('returns distinct tokens for distinct owners', () => {
    assert.notEqual(new NodeOwnerToken().get(), new NodeOwnerToken().get());
  });
});
