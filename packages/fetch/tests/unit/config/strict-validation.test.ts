import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';

void describe('Strict Configuration Validation', () => {
  void it('should reject configuration with unknown key', () => {
    assert.throws(() => {
      FetchClient.create({
        baseURL: 'https://api.example.com',
        unknownKey: 'value'
      } as never);
    }, /unknownKey/u);
  });

  void it('should reject configuration with multiple unknown keys', () => {
    assert.throws(() => {
      FetchClient.create({
        baseURL: 'https://api.example.com',
        unknownKey1: 'value1',
        unknownKey2: 'value2'
      } as never);
    }, /not declared/u);
  });

  void it('should reject configuration with typo in key name', () => {
    assert.throws(() => {
      FetchClient.create({ baseUrl: 'https://api.example.com' } as never);
    }, /baseUrl/u);
  });

  void it('should reject configuration with wrong case', () => {
    assert.throws(() => {
      FetchClient.create({ BaseURL: 'https://api.example.com' } as never);
    }, /BaseURL/u);
  });

  void it('should accept empty configuration', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({});
    });
  });

  void it('should accept valid configuration with all known keys', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        baseURL: 'https://api.example.com',
        headers: { Authorization: 'Bearer token' },
        params: { page: 1 },
        timeout: 5000
      });
    });
  });

  void it('should accept configuration with optional keys undefined', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        baseURL: 'https://api.example.com',
        headers: undefined,
        timeout: undefined
      });
    });
  });

  void it('should reject configuration with nested unknown keys in options', () => {
    assert.throws(() => {
      FetchClient.create({
        baseURL: 'https://api.example.com',
        invalidOption: { nested: 'value' }
      } as never);
    }, /invalidOption/u);
  });
});
