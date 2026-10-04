import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ContainsBrandInterface, MaximumItemsBrandInterface, MinimumItemsBrandInterface, UniqueItemsBrandInterface } from '../../../../src/interfaces/index.js';
import type {
  ContentEncodingBrandType,
  ContentMediaTypeBrandType,
  ExclusiveMaximumBrandType,
  ExclusiveMinimumBrandType,
  FormatBrandType,
  MaximumBrandType,
  MaximumLengthBrandType,
  MinimumBrandType,
  MinimumLengthBrandType,
  MultipleOfBrandType,
  PatternBrandType
} from '../../../../src/types/brands/index.js';
import type { IdentityType } from '../../../../src/types/IdentityType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { RecursiveTreeSchemaInterface } from '../../fixtures/interfaces/RecursiveTreeSchemaInterface.js';
import type { RecursiveTreeStaticInterface } from '../../fixtures/interfaces/RecursiveTreeStaticInterface.js';
import type { AssertType, EqualType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

void describe('SchemaNode scalar constructors', () => {
  const nameNode = SchemaNode.defineString({ 'format': 'email', 'maxLength': 64, 'minLength': 1, 'type': 'string' } as const);

  void it('defineString brands minLength/maxLength/format onto string', () => {
    assert.equal(nameNode.schema.minLength, 1);
    assert.equal(nameNode.schema.format, 'email');
    const checks: [AssertType<EqualType<NodeStaticType<typeof nameNode>, FormatBrandType<'email'> & MaximumLengthBrandType<64> & MinimumLengthBrandType<1> & Record<never, never> & string>>] = [true];
    assert.deepEqual(checks, [true]);
    assert.equal(nameNode.schema.format, 'email');
  });

  const codeNode = SchemaNode.defineString({ 'pattern': '^[A-Z]{3}$', 'type': 'string' } as const);

  void it('defineString brands pattern onto string', () => {
    assert.equal(codeNode.schema.pattern, '^[A-Z]{3}$');
    const checks: [AssertType<EqualType<NodeStaticType<typeof codeNode>, PatternBrandType<'^[A-Z]{3}$'> & Record<never, never> & string>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const blobNode = SchemaNode.defineString({ 'contentEncoding': 'base64', 'contentMediaType': 'image/png', 'type': 'string' } as const);

  void it('defineString brands contentEncoding/contentMediaType onto string', () => {
    assert.equal(blobNode.schema.contentEncoding, 'base64');
    const checks: [AssertType<EqualType<NodeStaticType<typeof blobNode>, ContentEncodingBrandType<'base64'> & ContentMediaTypeBrandType<'image/png'> & Record<never, never> & string>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const ageNode = SchemaNode.defineNumber({ 'maximum': 120, 'minimum': 0, 'type': 'number' } as const);

  void it('defineNumber brands minimum/maximum onto number', () => {
    assert.equal(ageNode.schema.minimum, 0);
    const checks: [AssertType<EqualType<NodeStaticType<typeof ageNode>, MaximumBrandType<120> & MinimumBrandType<0> & number & Record<never, never>>>] = [true];
    assert.deepEqual(checks, [true]);
    assert.equal(ageNode.schema.maximum, 120);
  });

  const evenNode = SchemaNode.defineNumber({ 'exclusiveMaximum': 100, 'exclusiveMinimum': 0, 'multipleOf': 2, 'type': 'integer' } as const);

  void it('defineNumber brands exclusiveMinimum/exclusiveMaximum/multipleOf onto number', () => {
    assert.equal(evenNode.schema.multipleOf, 2);
    const checks: [AssertType<EqualType<NodeStaticType<typeof evenNode>, ExclusiveMaximumBrandType<100> & ExclusiveMinimumBrandType<0> & MultipleOfBrandType<2> & number & Record<never, never>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineBoolean derives plain boolean', () => {
    const flagNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
    assert.equal(flagNode.schema.type, 'boolean');
    const assignable: NodeStaticType<typeof flagNode> = true;
    assert.deepEqual(assignable, true);
  });

  void it('defineNull derives plain null', () => {
    const nullNode = SchemaNode.defineNull({ 'type': 'null' } as const);
    assert.equal(nullNode.schema.type, 'null');
    const assignable: NodeStaticType<typeof nullNode> = null;
    assert.deepEqual(assignable, null);
  });

  void it('defineConst derives the exact literal', () => {
    const versionNode = SchemaNode.defineConst({}, 'v1' as const);
    assert.equal(versionNode.schema.const, 'v1');
    const assignable: NodeStaticType<typeof versionNode> = 'v1';
    assert.deepEqual(assignable, 'v1');
  });

  void it('defineEnum derives the literal union', () => {
    const colorNode = SchemaNode.defineEnum({}, ['red', 'green', 'blue'] as const);
    assert.deepEqual(colorNode.schema.enum, ['red', 'green', 'blue']);
    const assignable: NodeStaticType<typeof colorNode> = 'green';
    assert.deepEqual(assignable, 'green');
  });
});

void describe('SchemaNode object constructor', () => {
  const nameNode = SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const);
  const ageNode = SchemaNode.defineNumber({ 'maximum': 120, 'minimum': 0, 'type': 'number' } as const);

  const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'age': ageNode, 'name': nameNode }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  void it('required properties become non-optional, others optional', () => {
    assert.deepEqual(userNode.schema.required, ['name']);
    const checks: [AssertType<EqualType<NodeStaticType<typeof userNode>, IdentityType<{ 'age'?: NodeStaticType<typeof ageNode> } & { 'name': NodeStaticType<typeof nameNode> }>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const bagNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': true, 'patternProperties': {} });

  void it('additionalProperties true opens the object to unknown extras', () => {
    assert.equal(bagNode.schema.additionalProperties, true);
    const checks: [AssertType<EqualType<NodeStaticType<typeof bagNode>, IdentityType<Record<string, unknown> & { 'id': NodeStaticType<typeof nameNode> }>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('additionalProperties defaults to false at runtime, matching its closed type default', () => {
    const closedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    assert.equal(closedNode.schema.additionalProperties, false);
  });

  void it('minProperties/maxProperties brand the object', () => {
    const boundedNode = SchemaNode.defineObject({ 'maxProperties': 3, 'minProperties': 1, 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    assert.equal(boundedNode.schema.minProperties, 1);
    assert.equal(boundedNode.schema.maxProperties, 3);
  });

  const skuNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
  const catalogNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], {
    'additionalProperties': false, 'patternProperties': { '^sku-': skuNode } });

  void it('patternProperties with an anchored literal pattern derives a template-literal key', () => {
    assert.deepEqual(catalogNode.schema.patternProperties, { '^sku-': skuNode });
    const checks: [AssertType<EqualType<NodeStaticType<typeof catalogNode>, IdentityType<Record<`sku-${string}`, NodeStaticType<typeof skuNode>>>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const anyNode = SchemaNode.defineString({ 'type': 'string' } as const);
  const wildcardNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], {
    'additionalProperties': false, 'patternProperties': { '^[a-z]+$': anyNode } });

  void it('patternProperties with a non-literal pattern falls back to a no-op ({})', () => {
    const checks: [AssertType<EqualType<NodeStaticType<typeof wildcardNodeType>, IdentityType<Record<never, never>>>>] = [true];
    assert.deepEqual(checks, [true]);
  });
});

void describe('SchemaNode array/tuple constructors', () => {
  const codeNode = SchemaNode.defineString({ 'pattern': '^[A-Z]{3}$', 'type': 'string' } as const);
  const ageNode = SchemaNode.defineNumber({ 'maximum': 120, 'minimum': 0, 'type': 'number' } as const);
  const versionNode = SchemaNode.defineConst({}, 'v1' as const);

  const tagsNode = SchemaNode.defineArray({ 'maxItems': 5, 'minItems': 1, 'type': 'array' } as const, codeNode, undefined);

  void it('defineArray derives an array of the item static, brands minItems/maxItems', () => {
    assert.equal(tagsNode.schema.minItems, 1);
    const checks: [AssertType<EqualType<NodeStaticType<typeof tagsNode>, MaximumItemsBrandInterface<5> & MinimumItemsBrandInterface<1> & NodeStaticType<typeof codeNode>[] & Record<never, never>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const uniqueTagsNode = SchemaNode.defineArray({ 'type': 'array', 'uniqueItems': true } as const, codeNode, undefined);

  void it('defineArray with uniqueItems: true carries the UniqueItemsBrandInterface', () => {
    assert.equal(uniqueTagsNode.schema.uniqueItems, true);
    const checks: [AssertType<EqualType<NodeStaticType<typeof uniqueTagsNode>, NodeStaticType<typeof codeNode>[] & Record<never, never> & UniqueItemsBrandInterface<true>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const withContainsNode = SchemaNode.defineArray({ 'type': 'array' } as const, ageNode, versionNode);

  void it('defineArray with contains carries the ContainsBrandInterface', () => {
    assert.deepEqual(withContainsNode.schema.contains, versionNode);
    const checks: [AssertType<EqualType<NodeStaticType<typeof withContainsNode>, ContainsBrandInterface<NodeStaticType<typeof versionNode>> & NodeStaticType<typeof ageNode>[] & Record<never, never>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  const pairNode = SchemaNode.defineTuple({ 'type': 'array' } as const, [codeNode, ageNode] as const);

  void it('defineTuple preserves per-slot types and arity', () => {
    assert.equal(pairNode.schema.prefixItems.length, 2);
    const checks: [AssertType<EqualType<NodeStaticType<typeof pairNode>, ([] | [NodeStaticType<typeof codeNode>] | [NodeStaticType<typeof codeNode>, NodeStaticType<typeof ageNode>, ...unknown[]]) & Record<never, never>>>] = [true];
    assert.deepEqual(checks, [true]);
  });
});

void describe('SchemaNode composition constructors', () => {
  const nameNode = SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const);
  const ageNode = SchemaNode.defineNumber({ 'maximum': 120, 'minimum': 0, 'type': 'number' } as const);
  const flagNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
  const nullNode = SchemaNode.defineNull({ 'type': 'null' } as const);

  void it('defineAllOf intersects branch statics', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const boundedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'age': ageNode }, ['age'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const allOfNode = SchemaNode.defineAllOf({}, [userNode, boundedNode] as const);

    assert.equal(allOfNode.schema.allOf.length, 2);
    const checks: [AssertType<EqualType<NodeStaticType<typeof allOfNode>, IdentityType<NodeStaticType<typeof boundedNode> & NodeStaticType<typeof userNode>>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineAnyOf unions branch statics', () => {
    const anyOfNodeType = SchemaNode.defineAnyOf({}, [nameNode, ageNode] as const);

    const checks: [AssertType<EqualType<NodeStaticType<typeof anyOfNodeType>, NodeStaticType<typeof ageNode> | NodeStaticType<typeof nameNode>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineOneOf unions branch statics', () => {
    const oneOfNodeType = SchemaNode.defineOneOf({}, [flagNode, nullNode] as const);
    const assignableBoolean: NodeStaticType<typeof oneOfNodeType> = true;
    assert.deepEqual(assignableBoolean, true);
    const assignableNull: NodeStaticType<typeof oneOfNodeType> = null;
    assert.deepEqual(assignableNull, null);
  });

  void it('defineNot falls back to unknown', () => {
    const notNode = SchemaNode.defineNot({}, nameNode);
    assert.deepEqual(notNode.schema.not, nameNode);
    const assignable: NodeStaticType<typeof notNode> = 'anything';
    assert.deepEqual(assignable, 'anything');
  });

  void it('defineConditional unions then/else statics under renamed ifSchema/thenSchema/elseSchema keys', () => {
    const condNode = SchemaNode.defineConditional(flagNode, ageNode, nameNode);

    assert.deepEqual(condNode.schema.thenSchema, ageNode);
    assert.deepEqual(condNode.schema.elseSchema, nameNode);
    const checks: [AssertType<EqualType<NodeStaticType<typeof condNode>, NodeStaticType<typeof ageNode> | NodeStaticType<typeof nameNode>>>] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineRecursive lets a node reference itself, TypeBox Type.Recursive-style', () => {
    const treeNode = SchemaNode.defineRecursive<RecursiveTreeSchemaInterface, RecursiveTreeStaticInterface>((self) => {
      const built = SchemaNode.defineObject({ 'type': 'object' } as const, { 'children': SchemaNode.defineArray({ 'type': 'array' } as const, self, undefined), 'label': nameNode }, ['label', 'children'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return built;
    });

    assert.equal(treeNode.schema.type, 'object');
    const assignable: NodeStaticType<typeof treeNode> = { 'children': [{ 'children': [], 'label': 'child' }], 'label': 'root' };
    assert.deepEqual(assignable, { 'children': [{ 'children': [], 'label': 'child' }], 'label': 'root' });
  });

  void it('$ref by node reuse: the same built node composed twice shares its static type', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const reusedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'primary': userNode, 'secondary': userNode }, ['primary'] as const, { 'additionalProperties': false, 'patternProperties': {} });

    assert.deepEqual(reusedNode.schema.properties?.primary, reusedNode.schema.properties?.secondary);
    const checks: [AssertType<EqualType<NodeStaticType<typeof reusedNode>, IdentityType<{ 'primary': NodeStaticType<typeof userNode> } & { 'secondary'?: NodeStaticType<typeof userNode> }>>>] = [true];
    assert.deepEqual(checks, [true]);
  });
});
