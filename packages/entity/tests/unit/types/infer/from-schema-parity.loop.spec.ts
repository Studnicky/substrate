import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FromSchema } from 'json-schema-to-ts';

import type { ApplyArrayConstraintBrandsType } from '../../../../src/types/index.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { Assert, Equal } from './type-level-assert.js';

/** Compiles only if `Infer` is assignable to the real `FromSchema` output — ours strictly narrower, never incompatible. */
function assertInferAssignableToFromSchema<TInfer, TFromSchema>(identity: (v: TInfer) => TFromSchema): void {
  void identity;
}
/** Compiles only if `Infer` and the real `FromSchema` output are mutually assignable — no brand narrows either side. */
function assertMutuallyAssignable<TInfer, TFromSchema>(forward: (v: TInfer) => TFromSchema, backward: (v: TFromSchema) => TInfer): void {
  void forward;
  void backward;
}
/** Compiles only if `value` structurally satisfies `T`. */
function assertAssignable<T>(value: T): void {
  void value;
}

void describe('SchemaNode static types are never incompatible with the real FromSchema', () => {
  void it('string minLength/maxLength: Infer (branded) assignable to FromSchema', () => {
    const schema = { 'type': 'string', 'minLength': 1, 'maxLength': 10 } as const;
    const node = SchemaNode.defineString(schema);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertInferAssignableToFromSchema<Infer, FS>((v) => v);
    assert.equal(node.schema.minLength, 1);
  });

  void it('number minimum/maximum: Infer (branded) assignable to FromSchema', () => {
    const schema = { 'type': 'number', 'minimum': 0, 'maximum': 100 } as const;
    const node = SchemaNode.defineNumber(schema);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertInferAssignableToFromSchema<Infer, FS>((v) => v);
    assert.equal(node.schema.maximum, 100);
  });

  void it('boolean: mutually assignable with FromSchema', () => {
    const schema = { 'type': 'boolean' } as const;
    const node = SchemaNode.defineBoolean(schema);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.type, 'boolean');
  });

  void it('null: mutually assignable with FromSchema', () => {
    const schema = { 'type': 'null' } as const;
    const node = SchemaNode.defineNull(schema);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.type, 'null');
  });

  void it('const: mutually assignable with FromSchema', () => {
    const schema = { 'const': 'v1' } as const;
    const node = SchemaNode.defineConst('v1' as const);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.const, 'v1');
  });

  void it('enum: mutually assignable with FromSchema', () => {
    const schema = { 'enum': ['a', 'b', 'c'] } as const;
    const node = SchemaNode.defineEnum(['a', 'b', 'c'] as const);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.deepEqual(node.schema.enum, ['a', 'b', 'c']);
  });

  void it('object properties/required, unbranded leaves: mutually assignable with FromSchema', () => {
    const schema = {
      'type': 'object',
      'properties': { 'name': { 'type': 'string' }, 'age': { 'type': 'number' } },
      'required': ['name']
    } as const;
    const node = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'age': SchemaNode.defineNumber({ 'type': 'number' } as const) },
      ['name'] as const
    );
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.deepEqual(node.schema.required, ['name']);
  });

  void it('array of unbranded string: mutually assignable with FromSchema', () => {
    const schema = { 'type': 'array', 'items': { 'type': 'string' } } as const;
    const node = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const));
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.type, 'array');
  });

  void it('bare prefixItems: open union (any prefix length, open tail)', () => {
    // json-schema-to-ts@3.1.1 does not recognize the 2020-12 'prefixItems' keyword at all — FromSchema
    // falls back to a bare 'unknown[]' for it, so only the forward direction (ours into that fallback)
    // is a meaningful parity claim here; there is no real tuple type on the other side to compare against.
    const schema = { 'type': 'array', 'prefixItems': [{ 'type': 'string' }, { 'type': 'number' }] } as const;
    const node = SchemaNode.defineTuple({ 'type': 'array' } as const, [
      SchemaNode.defineString({ 'type': 'string' } as const),
      SchemaNode.defineNumber({ 'type': 'number' } as const)
    ] as const);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertInferAssignableToFromSchema<Infer, FS>((v) => v);
    assertAssignable<Infer>([]);
    assertAssignable<Infer>(['a']);
    assertAssignable<Infer>(['a', 1]);
    assertAssignable<Infer>(['a', 1, 'extra', true]);
    assert.equal(node.schema.prefixItems.length, 2);
  });

  void it('prefixItems + minItems reaching full length: single variant, open tail unless closed', () => {
    const firstItemNode = SchemaNode.defineString({ 'type': 'string' } as const);
    const secondItemNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
    const node = SchemaNode.defineTuple({ 'type': 'array', 'minItems': 2 } as const, [firstItemNode, secondItemNode] as const);
    type Infer = NodeStaticType<typeof node>;
    // MinimumItemsBrandInterface is phantom; the open tail admits any extra elements after the two required slots.
    type ExpectedType = ApplyArrayConstraintBrandsType<{ 'type': 'array'; 'minItems': 2 }>
      & [NodeStaticType<typeof firstItemNode>, NodeStaticType<typeof secondItemNode>, ...unknown[]];
    type ShapeCheck = Assert<Equal<Infer, ExpectedType>>;
    const check: ShapeCheck = true;
    const two: [string, number] = ['a', 1];
    const three: [string, number, string] = ['a', 1, 'extra'];

    assert.ok(check);
    assertAssignable<[string, number, ...unknown[]]>(two);
    assertAssignable<[string, number, ...unknown[]]>(three);
  });

  void it('prefixItems + minItems + items: false: exact closed tuple, no open tail', () => {
    const firstItemNode = SchemaNode.defineString({ 'type': 'string' } as const);
    const secondItemNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
    const node = SchemaNode.defineTuple({ 'type': 'array', 'minItems': 2, 'items': false } as const, [firstItemNode, secondItemNode] as const);
    type Infer = NodeStaticType<typeof node>;
    type ExpectedType = ApplyArrayConstraintBrandsType<{ 'type': 'array'; 'minItems': 2; 'items': false }>
      & [NodeStaticType<typeof firstItemNode>, NodeStaticType<typeof secondItemNode>];
    type ShapeCheck = Assert<Equal<Infer, ExpectedType>>;
    const check: ShapeCheck = true;
    const two: [string, number] = ['a', 1];

    assert.ok(check);
    assertAssignable<[string, number]>(two);
    assert.equal(node.schema.items, false);
  });

  void it('allOf intersection, unbranded leaves: mutually assignable with FromSchema', () => {
    const aSchema = { 'type': 'object', 'properties': { 'a': { 'type': 'string' } }, 'required': ['a'] } as const;
    const bSchema = { 'type': 'object', 'properties': { 'b': { 'type': 'number' } }, 'required': ['b'] } as const;
    const schema = { 'allOf': [aSchema, bSchema] } as const;
    const aNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineString({ 'type': 'string' } as const) }, ['a'] as const);
    const bNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'b': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['b'] as const);
    const node = SchemaNode.defineAllOf([aNode, bNode] as const);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.allOf.length, 2);
  });

  void it('anyOf union, unbranded leaves: mutually assignable with FromSchema', () => {
    const aSchema = { 'type': 'string' } as const;
    const bSchema = { 'type': 'number' } as const;
    const schema = { 'anyOf': [aSchema, bSchema] } as const;
    const node = SchemaNode.defineAnyOf([SchemaNode.defineString(aSchema), SchemaNode.defineNumber(bSchema)] as const);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.anyOf.length, 2);
  });

  void it('oneOf union, unbranded leaves: mutually assignable with FromSchema', () => {
    const aSchema = { 'type': 'string' } as const;
    const bSchema = { 'type': 'null' } as const;
    const schema = { 'oneOf': [aSchema, bSchema] } as const;
    const node = SchemaNode.defineOneOf([SchemaNode.defineString(aSchema), SchemaNode.defineNull(bSchema)] as const);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.equal(node.schema.oneOf.length, 2);
  });

  void it('pattern: Infer (branded) assignable to FromSchema', () => {
    const schema = { 'type': 'string', 'pattern': '^[A-Z]+$' } as const;
    const node = SchemaNode.defineString(schema);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertInferAssignableToFromSchema<Infer, FS>((v) => v);
    assert.equal(node.schema.pattern, '^[A-Z]+$');
  });

  void it('format: Infer (branded) assignable to FromSchema', () => {
    const schema = { 'type': 'string', 'format': 'date-time' } as const;
    const node = SchemaNode.defineString(schema);
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertInferAssignableToFromSchema<Infer, FS>((v) => v);
    assert.equal(node.schema.format, 'date-time');
  });

  void it('nested object with array-of-object property, unbranded leaves: mutually assignable with FromSchema', () => {
    const itemSchema = { 'type': 'object', 'properties': { 'id': { 'type': 'string' } }, 'required': ['id'] } as const;
    const schema = { 'type': 'object', 'properties': { 'items': { 'type': 'array', 'items': itemSchema } }, 'required': ['items'] } as const;
    const itemNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineString({ 'type': 'string' } as const) }, ['id'] as const);
    const node = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'items': SchemaNode.defineArray({ 'type': 'array' } as const, itemNode) },
      ['items'] as const
    );
    type Infer = NodeStaticType<typeof node>;
    type FS = FromSchema<typeof schema>;
    assertMutuallyAssignable<Infer, FS>(
      (v) => v,
      (v) => v
    );
    assert.deepEqual(node.schema.required, ['items']);
  });
});
