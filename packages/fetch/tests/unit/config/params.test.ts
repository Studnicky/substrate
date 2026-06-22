import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';

void describe('params validation', () => {
  void it('should reject non-object params', () => {
    assert.throws(() => {
      FetchClient.create({ params: 'invalid' as never });
    }, /params must be an object/u);
  });

  void it('should reject array params', () => {
    assert.throws(() => {
      FetchClient.create({ params: [] as never });
    }, /params must be an object/u);
  });

  void it('should reject invalid param value types', () => {
    assert.throws(() => {
      const invalidConfig = { params: { invalid: { nested: 'object' } } };

      // @ts-expect-error Testing invalid param value type
      FetchClient.create(invalidConfig);
    }, /param value for "invalid" must be string, number, boolean, or array of these types/u);
  });

  void it('should accept valid string params', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({ params: { key: 'value' } });
    });
  });

  void it('should accept valid number params', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({ params: { page: 1 } });
    });
  });

  void it('should accept valid boolean params', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({ params: { active: true } });
    });
  });

  void it('should accept valid array params', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        params: {
          tags: [
            'javascript',
            'typescript'
          ]
        }
      });
    });
  });

  void it('should accept null and undefined param values', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        params: {
          key: null,
          other: undefined
        }
      });
    });
  });
});
