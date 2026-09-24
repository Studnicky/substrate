import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';

import { EntityClosureRegistry } from '../../../src/compiler/EntityClosureRegistry.js';

const assertRegistry = EntityClosureRegistry.create(false);

function compile<T>(schema: object): EntityValidateFunctionInterface<T> {
  return assertRegistry.compile<T>(schema);
}

void describe('EntityClosureRegistry — structural keywords', () => {
  void it('type', () => {
    const validate = compile({ 'type': 'string' });
    assert.equal(validate('a'), true);
    assert.equal(validate(1), false);
    assert.equal(validate.errors?.[0]?.keyword, 'type');
  });

  void it('properties, required, additionalProperties', () => {
    const validate = compile({
      'additionalProperties': false,
      'properties': { 'a': { 'type': 'number' } },
      'required': ['a'],
      'type': 'object'
    });
    assert.equal(validate({ 'a': 1 }), true);
    assert.equal(validate({}), false);
    assert.equal(validate.errors?.[0]?.keyword, 'required');
    assert.equal(validate({ 'a': 1, 'b': 2 }), false);
    assert.equal(validate.errors?.[0]?.keyword, 'additionalProperties');
  });

  void it('patternProperties', () => {
    const validate = compile({ 'patternProperties': { '^x-': { 'type': 'string' } }, 'type': 'object' });
    assert.equal(validate({ 'x-a': 'ok' }), true);
    assert.equal(validate({ 'x-a': 1 }), false);
  });

  void it('propertyNames', () => {
    const validate = compile({ 'propertyNames': { 'pattern': '^[a-z]+$' }, 'type': 'object' });
    assert.equal(validate({ 'abc': 1 }), true);
    assert.equal(validate({ 'ABC': 1 }), false);
  });

  void it('minProperties, maxProperties', () => {
    const validate = compile({ 'maxProperties': 2, 'minProperties': 1, 'type': 'object' });
    assert.equal(validate({}), false);
    assert.equal(validate({ 'a': 1 }), true);
    assert.equal(validate({ 'a': 1, 'b': 2, 'c': 3 }), false);
  });

  void it('dependentRequired', () => {
    const validate = compile({ 'dependentRequired': { 'a': ['b'] }, 'type': 'object' });
    assert.equal(validate({ 'a': 1 }), false);
    assert.equal(validate({ 'a': 1, 'b': 2 }), true);
  });

  void it('dependentSchemas', () => {
    const validate = compile({
      'dependentSchemas': { 'a': { 'properties': { 'b': { 'type': 'string' } }, 'required': ['b'] } }, 'type': 'object'
    });
    assert.equal(validate({ 'a': 1 }), false);
    assert.equal(validate({ 'a': 1, 'b': 'ok' }), true);
  });
});

void describe('EntityClosureRegistry — array keywords', () => {
  void it('items, prefixItems', () => {
    const validate = compile({ 'items': { 'type': 'number' }, 'prefixItems': [{ 'type': 'string' }], 'type': 'array' });
    assert.equal(validate(['a', 1, 2]), true);
    assert.equal(validate(['a', 'b']), false);
    assert.equal(validate([1, 2]), false);
  });

  void it('contains, minContains, maxContains', () => {
    const validate = compile({ 'contains': { 'type': 'number' }, 'maxContains': 2, 'minContains': 1, 'type': 'array' });
    assert.equal(validate(['a', 'b']), false);
    assert.equal(validate(['a', 1]), true);
    assert.equal(validate([1, 2, 3]), false);
  });

  void it('minItems, maxItems, uniqueItems', () => {
    const validate = compile({ 'maxItems': 3, 'minItems': 1, 'type': 'array', 'uniqueItems': true });
    assert.equal(validate([]), false);
    assert.equal(validate([1, 1]), false);
    assert.equal(validate([1, 2]), true);
    assert.equal(validate([1, 2, 3, 4]), false);
  });
});

void describe('EntityClosureRegistry — scalar keywords', () => {
  void it('minLength, maxLength, pattern', () => {
    const validate = compile({ 'maxLength': 5, 'minLength': 2, 'pattern': '^[a-z]+$', 'type': 'string' });
    assert.equal(validate('ab'), true);
    assert.equal(validate('a'), false);
    assert.equal(validate('abcdefg'), false);
    assert.equal(validate('AB'), false);
  });

  void it('minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf', () => {
    const validate = compile({
      'exclusiveMaximum': 10, 'exclusiveMinimum': 0, 'maximum': 10, 'minimum': 0, 'multipleOf': 2, 'type': 'number'
    });
    assert.equal(validate(4), true);
    assert.equal(validate(0), false);
    assert.equal(validate(10), false);
    assert.equal(validate(3), false);
  });

  void it('const', () => {
    const validate = compile({ 'const': 'fixed' });
    assert.equal(validate('fixed'), true);
    assert.equal(validate('other'), false);
  });

  void it('enum', () => {
    const validate = compile({ 'enum': ['a', 'b'] });
    assert.equal(validate('a'), true);
    assert.equal(validate('c'), false);
  });

  void it('format', () => {
    const validate = compile({ 'format': 'email', 'type': 'string' });
    assert.equal(validate('a@b.com'), true);
    assert.equal(validate('not-an-email'), false);
  });

  void it('contentEncoding, contentMediaType', () => {
    const validate = compile({ 'contentEncoding': 'base64', 'contentMediaType': 'application/json', 'type': 'string' });
    const encoded = Buffer.from('{"a":1}').toString('base64');
    assert.equal(validate(encoded), true);
    assert.equal(validate('not base64!!'), false);
  });
});

void describe('EntityClosureRegistry — composition keywords', () => {
  void it('allOf', () => {
    const validate = compile({ 'allOf': [{ 'minimum': 0 }, { 'maximum': 10 }], 'type': 'number' });
    assert.equal(validate(5), true);
    assert.equal(validate(-1), false);
  });

  void it('anyOf', () => {
    const validate = compile({ 'anyOf': [{ 'type': 'string' }, { 'type': 'number' }] });
    assert.equal(validate('a'), true);
    assert.equal(validate(1), true);
    assert.equal(validate(true), false);
  });

  void it('oneOf', () => {
    const validate = compile({ 'oneOf': [{ 'multipleOf': 2 }, { 'multipleOf': 3 }], 'type': 'number' });
    assert.equal(validate(2), true);
    assert.equal(validate(6), false);
    assert.equal(validate(5), false);
  });

  void it('not', () => {
    const validate = compile({ 'not': { 'type': 'string' } });
    assert.equal(validate(1), true);
    assert.equal(validate('a'), false);
  });

  void it('if, then, else', () => {
    const schema: object = JSON.parse(
      '{"type":"object","if":{"properties":{"kind":{"const":"a"}}},'
      + '"then":{"required":["extra"]},"else":{"properties":{"kind":{"const":"b"}}}}'
    ) as object;
    const validate = compile(schema);
    assert.equal(validate({ 'kind': 'a', 'extra': 1 }), true);
    assert.equal(validate({ 'kind': 'a' }), false);
    assert.equal(validate({ 'kind': 'b' }), true);
  });

  void it('unevaluatedProperties across a losing anyOf branch counts the property as evaluated', () => {
    const validate = compile({
      'anyOf': [
        { 'properties': { 'a': { 'type': 'string' } }, 'required': ['a'] },
        { 'properties': { 'b': { 'type': 'string' } }, 'required': ['b'] }
      ],
      'type': 'object',
      'unevaluatedProperties': false
    });
    assert.equal(validate({ 'a': 'x' }), true);
    assert.equal(validate({ 'a': 'x', 'c': 'y' }), false);
  });

  void it('unevaluatedItems', () => {
    const validate = compile({ 'prefixItems': [{ 'type': 'string' }], 'type': 'array', 'unevaluatedItems': false });
    assert.equal(validate(['a']), true);
    assert.equal(validate(['a', 'b']), false);
  });
});

void describe('EntityClosureRegistry — reference keywords', () => {
  void it('$ref, $defs', () => {
    const validate = compile({
      '$defs': { 'positive': { 'exclusiveMinimum': 0, 'type': 'number' } },
      'properties': { 'value': { '$ref': '#/$defs/positive' } },
      'type': 'object'
    });
    assert.equal(validate({ 'value': 1 }), true);
    assert.equal(validate({ 'value': -1 }), false);
  });

  void it('$ref self-recursion (forward reference)', () => {
    const validate = compile({
      '$defs': {
        'node': {
          'properties': { 'children': { 'items': { '$ref': '#/$defs/node' }, 'type': 'array' }, 'value': { 'type': 'number' } },
          'type': 'object'
        }
      },
      '$ref': '#/$defs/node'
    });
    assert.equal(validate({ 'children': [{ 'children': [], 'value': 2 }], 'value': 1 }), true);
    assert.equal(validate({ 'children': [{ 'value': 'x' }], 'value': 1 }), false);
  });

  void it('$dynamicRef, $dynamicAnchor', () => {
    const validate = compile({
      '$dynamicAnchor': 'node',
      '$id': 'https://example.test/dynamic',
      'properties': { 'self': { '$dynamicRef': '#node' } },
      'type': 'object'
    });
    assert.equal(validate({ 'self': {} }), true);
  });
});

void describe('EntityClosureRegistry — boolean schemas and error shape', () => {
  void it('true and false schemas', () => {
    const alwaysValid = compile({});
    assert.equal(alwaysValid('anything'), true);
  });

  void it('every error carries the normalized diagnostic shape', () => {
    const validate = compile({
      '$id': 'https://example.test/error-shape',
      'properties': { 'port': { 'minimum': 1, 'type': 'integer' } },
      'required': ['port'],
      'type': 'object'
    });
    assert.equal(validate({ 'port': 0 }), false);
    const error = validate.errors?.[0];
    assert.ok(error !== undefined);
    assert.equal(typeof error.instancePath, 'string');
    assert.equal(typeof error.keyword, 'string');
    assert.equal(typeof error.schemaPath, 'string');
    assert.ok(error.params !== undefined);
  });
});
