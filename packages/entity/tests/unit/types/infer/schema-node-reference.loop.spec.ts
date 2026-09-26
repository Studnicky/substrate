import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JSONSchema7Type } from 'json-schema';

import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

// Non-recursive $ref: a wrapper object's property points at a sibling node, not a literal copy.
const idNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
const wrapperNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineReference('#/$defs/Id', idNode) }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
type WrapperStaticType = NodeStaticType<typeof wrapperNode>;
type NonRecursiveReferenceCheck = ExpectTrueType<EqualType<WrapperStaticType['id'], NodeStaticType<typeof idNode>>>;

interface JsonLikeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

// Self-recursive $ref: the array/object branches point back at the node under construction.
const jsonLikeNode = SchemaNode.defineRecursive<JsonLikeSchemaInterface, JSONSchema7Type>((self) => {
  return SchemaNode.defineAnyOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonLike', self), undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonLike', self), 'patternProperties': {} })
  ] as const);
});
type JsonLikeStaticType = NodeStaticType<typeof jsonLikeNode>;
type SelfRecursionCheck = ExpectTrueType<EqualType<JsonLikeStaticType, JSONSchema7Type>>;

// Two levels of nesting through both branches: object -> array -> object.
const twoLevelValue: JsonLikeStaticType = { 'nested': [1, 'two', { 'three': null }] };

void describe('SchemaNode.defineReference', () => {
  void it('type-checks the non-recursive and self-recursive cases above (enforced by tsc -b)', () => {
    const checks: [NonRecursiveReferenceCheck, SelfRecursionCheck] = [true, true];

    assert.ok(checks.every(Boolean));
  });

  void it('accepts a value nested two levels through the recursive $ref branches', () => {
    assert.deepEqual(twoLevelValue, { 'nested': [1, 'two', { 'three': null }] });
  });

  void it('$ref by node reuse and $ref by defineReference derive the same static type', () => {
    const reusedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'primary': idNode, 'secondary': SchemaNode.defineReference('#/$defs/Id', idNode) }, ['primary'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    type ReusedStaticType = NodeStaticType<typeof reusedNode>;
    type SameShapeCheck = ExpectTrueType<EqualType<ReusedStaticType['secondary'], NodeStaticType<typeof idNode> | undefined>>;
    const check: SameShapeCheck = true;

    assert.ok(check);
  });
});
