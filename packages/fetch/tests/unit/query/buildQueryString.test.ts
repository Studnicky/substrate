import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { UrlUtils } from '../../../src/index.js';

const { buildQueryString } = UrlUtils;

void describe('buildQueryString', () => {
  void it('should build query string from object', () => {
    const result = buildQueryString({
      limit: 10,
      page: 1
    });

    assert.strictEqual(result, 'limit=10&page=1');
  });

  void it('should handle string values', () => {
    const result = buildQueryString({
      email: 'john@example.com',
      name: 'John Doe'
    });

    assert.strictEqual(result, 'email=john%40example.com&name=John%20Doe');
  });

  void it('should handle boolean values', () => {
    const result = buildQueryString({
      active: true,
      deleted: false
    });

    assert.strictEqual(result, 'active=true&deleted=false');
  });

  void it('should handle array values', () => {
    const result = buildQueryString({
      tags: [
        'javascript',
        'typescript'
      ]
    });

    assert.strictEqual(result, 'tags=javascript&tags=typescript');
  });

  void it('should skip null and undefined values', () => {
    const result = buildQueryString({
      filter: null,
      page: 1,
      sort: undefined
    });

    assert.strictEqual(result, 'page=1');
  });

  void it('should skip null items in arrays', () => {
    const result = buildQueryString({
      tags: [
        'js',
        null,
        'ts',
        undefined
      ] as Array<null | string | undefined>
    });

    assert.strictEqual(result, 'tags=js&tags=ts');
  });

  void it('should handle empty object', () => {
    const result = buildQueryString({});

    assert.strictEqual(result, '');
  });

  void it('should URL encode special characters', () => {
    const result = buildQueryString({
      filter: 'a&b=c',
      query: 'hello world!'
    });

    assert.strictEqual(result, 'filter=a%26b%3Dc&query=hello%20world!');
  });

  void it('should handle numbers', () => {
    const result = buildQueryString({
      id: 123,
      price: 99.99
    });

    assert.strictEqual(result, 'id=123&price=99.99');
  });
});
