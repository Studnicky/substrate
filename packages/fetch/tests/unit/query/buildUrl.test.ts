import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { UrlUtils } from '../../../src/index.js';

const { buildUrl } = UrlUtils;

void describe('buildUrl', () => {
  void it('should append query string to URL', () => {
    const result = buildUrl('/api/users', {
      limit: 10,
      page: 1
    });

    assert.strictEqual(result, '/api/users?limit=10&page=1');
  });

  void it('should handle URL with existing query params', () => {
    const result = buildUrl('/api/users?sort=name', { page: 1 });

    assert.strictEqual(result, '/api/users?sort=name&page=1');
  });

  void it('should handle full URLs', () => {
    const result = buildUrl('https://api.example.com/users', { page: 1 });

    assert.strictEqual(result, 'https://api.example.com/users?page=1');
  });

  void it('should return original URL if no params', () => {
    const result = buildUrl('/api/users');

    assert.strictEqual(result, '/api/users');
  });

  void it('should return original URL if params are empty', () => {
    const result = buildUrl('/api/users', {});

    assert.strictEqual(result, '/api/users');
  });

  void it('should handle params with all null/undefined values', () => {
    const result = buildUrl('/api/users', {
      filter: null,
      sort: undefined
    });

    assert.strictEqual(result, '/api/users');
  });

  void it('should handle arrays in params', () => {
    const result = buildUrl('/api/search', {
      active: true,
      tags: [
        'js',
        'ts'
      ]
    });

    assert.strictEqual(result, '/api/search?active=true&tags=js&tags=ts');
  });
});
