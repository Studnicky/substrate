import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Compose } from '../../../src/types/Compose.js';

interface FixtureNodeStaticInterface {
  'age': number;
  'email': string;
  'name': string;
}

void describe('Compose', () => {
  const node: { 'schema': { 'properties': Record<string, unknown>; 'required': readonly string[]; 'type': string } } = {
    'schema': {
      'properties': {
        'age': { 'type': 'number' },
        'email': { 'type': 'string' },
        'name': { 'type': 'string' }
      },
      'required': ['name', 'email'],
      'type': 'object'
    }
  };

  void it('pick narrows properties and required to the given keys', () => {
    const picked = Compose.pick<typeof node.schema, FixtureNodeStaticInterface, 'email' | 'name'>(node, ['name', 'email']);

    assert.deepEqual(Object.keys(picked.schema.properties), ['email', 'name']);
    assert.deepEqual(picked.schema.required, ['name', 'email']);
  });

  void it('omit removes the given keys from properties and required', () => {
    const omitted = Compose.omit<typeof node.schema, FixtureNodeStaticInterface, 'email'>(node, ['email']);

    assert.deepEqual(Object.keys(omitted.schema.properties), ['age', 'name']);
    assert.deepEqual(omitted.schema.required, ['name']);
  });

  void it('partial empties the required array', () => {
    const partial = Compose.partial<typeof node.schema, FixtureNodeStaticInterface>(node);

    assert.deepEqual(partial.schema.required, []);
    assert.deepEqual(Object.keys(partial.schema.properties), ['age', 'email', 'name']);
  });

  void it('require lists every property key as required', () => {
    const required = Compose.require<typeof node.schema, FixtureNodeStaticInterface>(node);

    assert.deepEqual(required.schema.required.toSorted(), ['age', 'email', 'name']);
  });

  void it('extend merges an extension schema, the extension winning collisions', () => {
    const extension: { 'schema': { 'properties': Record<string, unknown>; 'required': readonly string[]; 'type': string } } = {
      'schema': {
        'properties': { 'email': { 'format': 'email', 'type': 'string' }, 'role': { 'type': 'string' } },
        'required': ['role'],
        'type': 'object'
      }
    };

    const extended = Compose.extend<
      typeof node.schema,
      FixtureNodeStaticInterface,
      typeof extension.schema,
      { 'email': string; 'role': string }
    >(node, extension);

    assert.deepEqual(extended.schema.properties.email, { 'format': 'email', 'type': 'string' });
    assert.deepEqual(Object.keys(extended.schema.properties), ['age', 'email', 'name', 'role']);
    assert.deepEqual(extended.schema.required.toSorted(), ['email', 'name', 'role']);
  });
});
