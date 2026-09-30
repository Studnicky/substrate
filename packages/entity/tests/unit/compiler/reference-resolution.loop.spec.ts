import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityClosureRegistry } from '../../../src/compiler/EntityClosureRegistry.js';

const assertRegistry = EntityClosureRegistry.create(false);

void describe('reference resolution — base URI mechanics', () => {
  void it('nested $id changes the base for a relative $ref beneath it', () => {
    const validate = assertRegistry.compile({
      '$id': 'http://example.com/root.json',
      'properties': {
        'foo': {
          '$defs': { 'inner': { 'type': 'string' } },
          '$id': 'nested.json',
          '$ref': '#/$defs/inner'
        }
      }
    });
    assert.equal(validate({ 'foo': 'ok' }), true);
    assert.equal(validate({ 'foo': 1 }), false);
  });

  void it('a plain $anchor resolves scoped to its own base URI, not a document-wide flat name', () => {
    const validate = assertRegistry.compile({
      '$defs': {
        'a': { '$id': 'child1', 'allOf': [{ '$anchor': 'shared', '$id': 'child2', 'type': 'number' }, { '$anchor': 'shared', 'type': 'string' }] }
      },
      '$id': 'http://example.com/foobar',
      '$ref': 'child1#shared'
    });
    assert.equal(validate('a string'), true);
    assert.equal(validate(1), false);
  });

  void it('a $ref cycle through self-referential data terminates instead of recursing forever', () => {
    const validate = assertRegistry.compile({
      '$defs': { 'node': { 'properties': { 'next': { '$ref': '#/$defs/node' } }, 'type': 'object' } },
      '$ref': '#/$defs/node'
    });
    const cyclic: Record<string, unknown> = {};
    cyclic.next = cyclic;
    assert.doesNotThrow(() => {
      validate(cyclic);
    });
  });

  void it('sequential distinct references to the same value both apply — no false-positive cycle', () => {
    const validate = assertRegistry.compile({
      '$id': 'http://example.com/outer.json',
      '$ref': 'inner.json',
      'properties': {
        'foo': {
          '$defs': { 'inner': { 'properties': { 'bar': { 'type': 'string' } } } },
          '$id': 'inner.json',
          '$ref': '#/$defs/inner'
        }
      }
    });
    assert.equal(validate({ 'bar': 'a', 'foo': { 'bar': 'a' } }), true);
    assert.equal(validate({ 'bar': 1, 'foo': { 'bar': 'a' } }), false);
    assert.equal(validate({ 'bar': 'a', 'foo': { 'bar': 1 } }), false);
  });
});

void describe('reference resolution — $dynamicRef', () => {
  void it('scans the dynamic scope outermost-inward, resolving to the first matching $dynamicAnchor', () => {
    const validate = assertRegistry.compile({
      '$defs': {
        'itemType': { '$dynamicAnchor': 'itemType', 'type': 'number' },
        'list': {
          '$defs': { 'defaultItemType': { '$dynamicAnchor': 'itemType' } },
          '$id': 'list',
          'items': { '$dynamicRef': '#itemType' },
          'type': 'array'
        }
      },
      '$id': 'http://example.com/typed-list',
      '$ref': 'list'
    });
    assert.equal(validate([1, 2, 3]), true);
    assert.equal(validate(['a']), false);
  });

  void it('falls back to static $ref resolution when its own target has no matching $dynamicAnchor (bookending)', () => {
    const validate = assertRegistry.compile({
      '$defs': {
        'list': {
          '$defs': { 'items': { '$anchor': 'items', 'type': 'string' } },
          '$id': 'list',
          'items': { '$dynamicRef': '#items' },
          'type': 'array'
        },
        'unrelated': { '$dynamicAnchor': 'items', 'type': 'number' }
      },
      '$id': 'http://example.com/no-bookend',
      '$ref': 'list'
    });
    assert.equal(validate(['a', 'b']), true);
    assert.equal(validate([1]), false);
  });
});

void describe('reference resolution — remote registration', () => {
  void it('resolves a $ref to an externally-registered schema, keyed by its retrieval URI', () => {
    const remotes = new Map<string, object | boolean>([['http://example.com/remote-integer.json', { 'type': 'integer' }]]);
    const validate = assertRegistry.compile({ '$ref': 'http://example.com/remote-integer.json' }, remotes);
    assert.equal(validate(1), true);
    assert.equal(validate('a'), false);
  });

  void it('resolves a fragment within a registered remote schema', () => {
    const remotes = new Map<string, object | boolean>([
      ['http://example.com/remote-defs.json', { '$defs': { 'str': { 'type': 'string' } } }]
    ]);
    const validate = assertRegistry.compile({ '$ref': 'http://example.com/remote-defs.json#/$defs/str' }, remotes);
    assert.equal(validate('a'), true);
    assert.equal(validate(1), false);
  });
});
