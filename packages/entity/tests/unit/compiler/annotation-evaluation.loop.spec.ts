import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';

import { EntityClosureRegistry } from '../../../src/compiler/EntityClosureRegistry.js';

const assertRegistry = EntityClosureRegistry.create(false);

function compile<T>(schema: object): EntityValidateFunctionInterface<T> {
  return assertRegistry.compile<T>(schema);
}

void describe('annotation evaluation — anyOf branch credit', () => {
  void it('a property evaluated by a validated but unselected anyOf branch still counts', () => {
    const validate = compile({
      'anyOf': [
        { 'properties': { 'a': { 'type': 'string' } }, 'required': ['a'] },
        { 'properties': { 'a': { 'type': 'string' }, 'b': { 'type': 'string' } }, 'required': ['a', 'b'] }
      ],
      'type': 'object',
      'unevaluatedProperties': false
    });
    assert.equal(validate({ 'a': 'x' }), true);
  });

  void it('a property evaluated only by a failed anyOf branch does not count', () => {
    const validate = compile({
      'anyOf': [
        { 'properties': { 'a': { 'type': 'string' }, 'c': { 'type': 'number' } }, 'required': ['a', 'c'] },
        { 'properties': { 'a': { 'type': 'string' } }, 'required': ['a'] }
      ],
      'type': 'object',
      'unevaluatedProperties': false
    });
    assert.equal(validate({ 'a': 'x', 'c': 'not-a-number' }), false);
  });
});

void describe('annotation evaluation — allOf failing member', () => {
  void it('a failing allOf member contributes nothing, even nested inside a losing anyOf branch', () => {
    const validate = compile({
      'anyOf': [
        { 'allOf': [{ 'properties': { 'a': { 'type': 'string' } } }, { 'required': ['never'] }] },
        true
      ],
      'type': 'object',
      'unevaluatedProperties': false
    });
    assert.equal(validate({ 'a': 'x' }), false);
  });

  void it('an allOf where every member passes credits every member\'s evaluated properties', () => {
    const validate = compile({
      'allOf': [{ 'properties': { 'a': { 'type': 'string' } } }, { 'properties': { 'b': { 'type': 'string' } } }],
      'type': 'object',
      'unevaluatedProperties': false
    });
    assert.equal(validate({ 'a': 'x', 'b': 'y' }), true);
  });
});

void describe('annotation evaluation — if/then/else credit', () => {
  void it('a failing if condition contributes nothing; else applies and its evaluated properties count', () => {
    const schema: object = JSON.parse(
      '{"type":"object","if":{"properties":{"foo":{"const":"then"}},"required":["foo"]},'
      + '"else":{"properties":{"baz":{"type":"string"}},"required":["baz"]},"unevaluatedProperties":false}'
    );
    const validate = compile(schema);
    assert.equal(validate({ 'baz': 'z' }), true);
  });

  void it('a successful if condition contributes its own evaluated properties even without then/else', () => {
    const validate = compile({
      'if': { 'patternProperties': { 'foo': { 'type': 'string' } } },
      'type': 'object',
      'unevaluatedProperties': false
    });
    assert.equal(validate({ 'foo': 'a' }), true);
    assert.equal(validate({ 'bar': 'a' }), false);
  });

  void it('then credits only when applied and succeeded; else never leaks when if passed', () => {
    const schema: object = JSON.parse(
      '{"type":"object","if":{"properties":{"foo":{"const":"then"}},"required":["foo"]},'
      + '"then":{"properties":{"bar":{"type":"string"}},"required":["bar"]},'
      + '"else":{"properties":{"baz":{"type":"string"}},"required":["baz"]},"unevaluatedProperties":false}'
    );
    const validate = compile(schema);
    assert.equal(validate({ 'bar': 'y', 'foo': 'then' }), true);
    assert.equal(validate({ 'baz': 'z', 'foo': 'then' }), false);
  });
});
