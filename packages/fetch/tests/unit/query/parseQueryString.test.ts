import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { UrlUtils } from '../../../src/index.js';

const { parseQueryString } = UrlUtils;

void describe('parseQueryString', () => {
  void it('should parse query string to object', () => {
    const result = parseQueryString('page=1&limit=10');

    assert.deepStrictEqual(result, {
      limit: '10',
      page: '1'
    });
  });

  void it('should handle query string with leading ?', () => {
    const result = parseQueryString('?page=1&limit=10');

    assert.deepStrictEqual(result, {
      limit: '10',
      page: '1'
    });
  });

  void it('should handle repeated keys as array', () => {
    const result = parseQueryString('tags=js&tags=ts&tags=py');

    assert.deepStrictEqual(result, {
      tags: [
        'js',
        'ts',
        'py'
      ]
    });
  });

  void it('should decode URL encoded values', () => {
    const result = parseQueryString('name=John%20Doe&email=john%40example.com');

    assert.deepStrictEqual(result, {
      email: 'john@example.com',
      name: 'John Doe'
    });
  });

  void it('should handle empty string', () => {
    const result = parseQueryString('');

    assert.deepStrictEqual(result, {});
  });

  void it('should handle just ?', () => {
    const result = parseQueryString('?');

    assert.deepStrictEqual(result, {});
  });

  void it('should handle keys without values', () => {
    const result = parseQueryString('debug&verbose');

    assert.deepStrictEqual(result, {
      debug: '',
      verbose: ''
    });
  });

  void it('should handle mixed single and repeated keys', () => {
    const result = parseQueryString('page=1&tags=js&tags=ts&active=true');

    assert.deepStrictEqual(result, {
      active: 'true',
      page: '1',
      tags: [
        'js',
        'ts'
      ]
    });
  });
});
