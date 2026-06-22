import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';

void describe('baseURL validation', () => {
  void it('should reject non-string baseURL', () => {
    assert.throws(() => {
      FetchClient.create({ baseURL: 123 as never });
    }, /baseURL must be a string/u);
  });

  void it('should reject empty baseURL', () => {
    assert.throws(() => {
      FetchClient.create({ baseURL: '' });
    }, /baseURL must not be empty/u);
  });

  void it('should reject invalid URL format', () => {
    assert.throws(() => {
      FetchClient.create({ baseURL: 'not-a-valid-url' });
    }, /baseURL must be a valid URL/u);
  });

  void it('should accept valid baseURL', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({ baseURL: 'https://api.example.com' });
    });
  });
});
