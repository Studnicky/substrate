import type { FromSchema } from 'json-schema-to-ts';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FormatBrandType, MaximumBrandType, MaximumLengthBrandType, MinimumBrandType, MinimumLengthBrandType, PatternBrandType } from '../../../../src/types/brands/index.js';
import type { ApplyArrayConstraintBrandsType } from '../../../../src/types/index.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, EqualType, IsAssignableType, NotType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

void describe('SchemaNode static types are never incompatible with the real FromSchema: scalars and objects', () => {
  void it('string minLength/maxLength: Infer is FromSchema exactly plus the length brands', () => {
    const schema = { 'maxLength': 10, 'minLength': 1, 'type': 'string' } as const;
    const node = SchemaNode.defineString(schema);
    // The plain FromSchema shape lacks both length brands, so it must not satisfy the derived static type.
    const checks: [AssertType<EqualType<NodeStaticType<typeof node>, FromSchema<typeof schema> & MaximumLengthBrandType<10> & MinimumLengthBrandType<1> & Record<never, never>>>, AssertType<NotType<IsAssignableType<FromSchema<typeof schema>, NodeStaticType<typeof node>>>>] = [true, true];
    assert.deepEqual(checks, [true, true]);
    assert.equal(node.schema.minLength, 1);
  });

  void it('number minimum/maximum: Infer is FromSchema exactly plus the range brands', () => {
    const schema = { 'maximum': 100, 'minimum': 0, 'type': 'number' } as const;
    const node = SchemaNode.defineNumber(schema);
    // The plain FromSchema shape lacks both range brands, so it must not satisfy the derived static type.
    const checks: [AssertType<EqualType<NodeStaticType<typeof node>, FromSchema<typeof schema> & MaximumBrandType<100> & MinimumBrandType<0> & Record<never, never>>>, AssertType<NotType<IsAssignableType<FromSchema<typeof schema>, NodeStaticType<typeof node>>>>] = [true, true];
    assert.deepEqual(checks, [true, true]);
    assert.equal(node.schema.maximum, 100);
  });

  void it('boolean: mutually assignable with FromSchema', () => {
    const schema = { 'type': 'boolean' } as const;
    const node = SchemaNode.defineBoolean(schema);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schema>>>,
      AssertType<IsAssignableType<FromSchema<typeof schema>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.type, 'boolean');
  });

  void it('null: mutually assignable with FromSchema', () => {
    const schema = { 'type': 'null' } as const;
    const node = SchemaNode.defineNull(schema);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schema>>>,
      AssertType<IsAssignableType<FromSchema<typeof schema>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.type, 'null');
  });

  void it('const: mutually assignable with FromSchema', () => {
    const schemaType = { 'const': 'v1' } as const;
    const node = SchemaNode.defineConst({}, 'v1' as const);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.const, 'v1');
  });

  void it('enum: mutually assignable with FromSchema', () => {
    const schemaType = { 'enum': ['a', 'b', 'c'] } as const;
    const node = SchemaNode.defineEnum({}, ['a', 'b', 'c'] as const);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.deepEqual(node.schema.enum, ['a', 'b', 'c']);
  });

  void it('object properties/required, unbranded leaves: mutually assignable with FromSchema', () => {
    const schemaType = {
      'properties': { 'age': { 'type': 'number' }, 'name': { 'type': 'string' } },
      'required': ['name'],
      'type': 'object'
    } as const;
    const node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'age': SchemaNode.defineNumber({ 'type': 'number' } as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.deepEqual(node.schema.required, ['name']);
  });

});

void describe('SchemaNode static types are never incompatible with the real FromSchema: arrays and tuples', () => {
  void it('array of unbranded string: mutually assignable with FromSchema', () => {
    const schemaType = { 'items': { 'type': 'string' }, 'type': 'array' } as const;
    const node = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.type, 'array');
  });

  void it('bare prefixItems: open union (any prefix length, open tail)', () => {
    // json-schema-to-ts@3.1.1 does not recognize the 2020-12 'prefixItems' keyword at all — FromSchema
    // falls back to a bare 'unknown[]' for it, so only the forward direction (ours into that fallback)
    // is a meaningful parity claim here; there is no real tuple type on the other side to compare against.
    const schemaType = { 'prefixItems': [{ 'type': 'string' }, { 'type': 'number' }], 'type': 'array' } as const;
    const node = SchemaNode.defineTuple({ 'type': 'array' } as const, [
      SchemaNode.defineString({ 'type': 'string' } as const),
      SchemaNode.defineNumber({ 'type': 'number' } as const)
    ] as const);
    const forward: AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>> = true;
    const prefixes: NodeStaticType<typeof node>[] = [[], ['a'], ['a', 1], ['a', 1, 'extra', true]];
    assert.equal(forward, true);
    assert.equal(prefixes.length, 4);
    assert.equal(node.schema.prefixItems.length, 2);
  });

  void it('prefixItems + minItems reaching full length: single variant, open tail unless closed', () => {
    const firstItemNode = SchemaNode.defineString({ 'type': 'string' } as const);
    const secondItemNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
    const nodeType = SchemaNode.defineTuple({ 'minItems': 2, 'type': 'array' } as const, [firstItemNode, secondItemNode] as const);
    // MinimumItemsBrandInterface is phantom; the open tail admits any extra elements after the two required slots.
    const check: AssertType<EqualType<NodeStaticType<typeof nodeType>, [NodeStaticType<typeof firstItemNode>, NodeStaticType<typeof secondItemNode>, ...unknown[]] & ApplyArrayConstraintBrandsType<{ 'minItems': 2; 'type': 'array'; }>>> = true;
    const two: [string, number] = ['a', 1];
    const three: [string, number, string] = ['a', 1, 'extra'];

    assert.ok(check);
    const openTwo: [string, number, ...unknown[]] = two;
    const openThree: [string, number, ...unknown[]] = three;
    assert.deepEqual(openTwo, ['a', 1]);
    assert.deepEqual(openThree, ['a', 1, 'extra']);
  });

  void it('prefixItems + minItems + items: false: exact closed tuple, no open tail', () => {
    const firstItemNode = SchemaNode.defineString({ 'type': 'string' } as const);
    const secondItemNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
    const node = SchemaNode.defineTuple({ 'items': false, 'minItems': 2, 'type': 'array' } as const, [firstItemNode, secondItemNode] as const);
    const check: AssertType<EqualType<NodeStaticType<typeof node>, [NodeStaticType<typeof firstItemNode>, NodeStaticType<typeof secondItemNode>] & ApplyArrayConstraintBrandsType<{ 'items': false; 'minItems': 2; 'type': 'array'; }>>> = true;
    const two: [string, number] = ['a', 1];

    assert.ok(check);
    const closedTwo: [string, number] = two;
    assert.deepEqual(closedTwo, ['a', 1]);
    assert.equal(node.schema.items, false);
  });

});

void describe('SchemaNode static types are never incompatible with the real FromSchema: compositions', () => {
  void it('allOf intersection, unbranded leaves: mutually assignable with FromSchema', () => {
    const aSchema = { 'properties': { 'a': { 'type': 'string' } }, 'required': ['a'], 'type': 'object' } as const;
    const bSchema = { 'properties': { 'b': { 'type': 'number' } }, 'required': ['b'], 'type': 'object' } as const;
    const schemaType = { 'allOf': [aSchema, bSchema] } as const;
    const aNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineString({ 'type': 'string' } as const) }, ['a'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const bNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'b': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['b'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const node = SchemaNode.defineAllOf({}, [aNode, bNode] as const);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.allOf.length, 2);
  });

  void it('anyOf union, unbranded leaves: mutually assignable with FromSchema', () => {
    const aSchema = { 'type': 'string' } as const;
    const bSchema = { 'type': 'number' } as const;
    const schemaType = { 'anyOf': [aSchema, bSchema] } as const;
    const node = SchemaNode.defineAnyOf({}, [SchemaNode.defineString(aSchema), SchemaNode.defineNumber(bSchema)] as const);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.anyOf.length, 2);
  });

  void it('oneOf union, unbranded leaves: mutually assignable with FromSchema', () => {
    const aSchema = { 'type': 'string' } as const;
    const bSchema = { 'type': 'null' } as const;
    const schemaType = { 'oneOf': [aSchema, bSchema] } as const;
    const node = SchemaNode.defineOneOf({}, [SchemaNode.defineString(aSchema), SchemaNode.defineNull(bSchema)] as const);
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.equal(node.schema.oneOf.length, 2);
  });

  void it('pattern: Infer is FromSchema exactly plus the pattern brand', () => {
    const schema = { 'pattern': '^[A-Z]+$', 'type': 'string' } as const;
    const node = SchemaNode.defineString(schema);
    // The plain FromSchema shape lacks the pattern brand, so it must not satisfy the derived static type.
    const checks: [AssertType<EqualType<NodeStaticType<typeof node>, FromSchema<typeof schema> & PatternBrandType<'^[A-Z]+$'> & Record<never, never>>>, AssertType<NotType<IsAssignableType<FromSchema<typeof schema>, NodeStaticType<typeof node>>>>] = [true, true];
    assert.deepEqual(checks, [true, true]);
    assert.equal(node.schema.pattern, '^[A-Z]+$');
  });

  void it('format: Infer is FromSchema exactly plus the format brand', () => {
    const schema = { 'format': 'date-time', 'type': 'string' } as const;
    const node = SchemaNode.defineString(schema);
    // The plain FromSchema shape lacks the format brand, so it must not satisfy the derived static type.
    const checks: [AssertType<EqualType<NodeStaticType<typeof node>, FormatBrandType<'date-time'> & FromSchema<typeof schema> & Record<never, never>>>, AssertType<NotType<IsAssignableType<FromSchema<typeof schema>, NodeStaticType<typeof node>>>>] = [true, true];
    assert.deepEqual(checks, [true, true]);
    assert.equal(node.schema.format, 'date-time');
  });

  void it('nested object with array-of-object property, unbranded leaves: mutually assignable with FromSchema', () => {
    const itemSchema = { 'properties': { 'id': { 'type': 'string' } }, 'required': ['id'], 'type': 'object' } as const;
    const schemaType = { 'properties': { 'items': { 'items': itemSchema, 'type': 'array' } }, 'required': ['items'], 'type': 'object' } as const;
    const itemNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineString({ 'type': 'string' } as const) }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'items': SchemaNode.defineArray({ 'type': 'array' } as const, itemNode, undefined) }, ['items'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const mutual: [
      AssertType<IsAssignableType<NodeStaticType<typeof node>, FromSchema<typeof schemaType>>>,
      AssertType<IsAssignableType<FromSchema<typeof schemaType>, NodeStaticType<typeof node>>>
    ] = [true, true];
    assert.deepEqual(mutual, [true, true]);
    assert.deepEqual(node.schema.required, ['items']);
  });
});
