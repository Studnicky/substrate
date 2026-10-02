import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { JsonLikeSchemaInterface } from '../../fixtures/interfaces/JsonLikeSchemaInterface.js';
import type { AssertType, EqualType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

// Non-recursive $ref: a wrapper object's property points at a sibling node, not a literal copy.
const idNode = SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const);
const wrapperNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineReference('#/$defs/Id', idNode) }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// Self-recursive $ref: the array/object branches point back at the node under construction.
const jsonLikeNodeType = SchemaNode.defineRecursive<JsonLikeSchemaInterface, JSONSchema7Type>((self) => {
  const union = SchemaNode.defineAnyOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonLike', self), undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonLike', self), 'patternProperties': {} })
  ] as const);

  return union;
});

// Two levels of nesting through both branches: object -> array -> object.
const twoLevelValue: NodeStaticType<typeof jsonLikeNodeType> = { 'nested': [1, 'two', { 'three': null }] };

void describe('SchemaNode.defineReference', () => {
  void it('type-checks the non-recursive and self-recursive cases above (enforced by tsc -b)', () => {
    const checks: [
      AssertType<EqualType<NodeStaticType<typeof wrapperNodeType>['id'], NodeStaticType<typeof idNode>>>,
      AssertType<EqualType<NodeStaticType<typeof jsonLikeNodeType>, JSONSchema7Type>>
    ] = [true, true];

    assert.ok(checks.every(Boolean));
  });

  void it('accepts a value nested two levels through the recursive $ref branches', () => {
    assert.deepEqual(twoLevelValue, { 'nested': [1, 'two', { 'three': null }] });
  });

  void it('$ref by node reuse and $ref by defineReference derive the same static type', () => {
    const reusedNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'primary': idNode, 'secondary': SchemaNode.defineReference('#/$defs/Id', idNode) }, ['primary'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const check: AssertType<EqualType<NodeStaticType<typeof reusedNodeType>['secondary'], NodeStaticType<typeof idNode> | undefined>> = true;

    assert.ok(check);
  });
});
