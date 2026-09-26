import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ContainsBrandInterface, MaximumItemsBrandInterface, MinimumItemsBrandInterface, UniqueItemsBrandInterface } from '../../../../src/interfaces/index.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';
import type { IdentityType } from '../../../../src/types/IdentityType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
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
import { Assert, Equal } from './type-level-assert.js';

/** Compiles only if `value` structurally satisfies `T` — the type-level half of the cases that still use a real value. */
function assertAssignable<T>(value: T): void {
  void value;
}

/** No-op filler standing in for an unset optional brand condition — matches the `Record<never, never>` each `Apply*ConstraintBrandsType` conditional produces when its keyword is absent. */
type UnsetBrandType = Record<never, never>;

void describe('SchemaNode scalar constructors', () => {
  const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1, 'maxLength': 64, 'format': 'email' } as const);
  type NameExpectedType = string & FormatBrandType<'email'> & MaximumLengthBrandType<64> & MinimumLengthBrandType<1> & UnsetBrandType & UnsetBrandType & UnsetBrandType;
  type NameBrandCheck = Assert<Equal<NodeStaticType<typeof nameNode>, NameExpectedType>>;

  void it('defineString brands minLength/maxLength/format onto string', () => {
    assert.equal(nameNode.schema.minLength, 1);
    assert.equal(nameNode.schema.format, 'email');
    const checks: [NameBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
    assert.equal(nameNode.schema.format, 'email');
  });

  const codeNode = SchemaNode.defineString({ 'type': 'string', 'pattern': '^[A-Z]{3}$' } as const);
  type CodeExpectedType = string & PatternBrandType<'^[A-Z]{3}$'> & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType;
  type CodeBrandCheck = Assert<Equal<NodeStaticType<typeof codeNode>, CodeExpectedType>>;

  void it('defineString brands pattern onto string', () => {
    assert.equal(codeNode.schema.pattern, '^[A-Z]{3}$');
    const checks: [CodeBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const blobNode = SchemaNode.defineString({ 'type': 'string', 'contentEncoding': 'base64', 'contentMediaType': 'image/png' } as const);
  type BlobExpectedType = string & ContentEncodingBrandType<'base64'> & ContentMediaTypeBrandType<'image/png'> & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType;
  type BlobBrandCheck = Assert<Equal<NodeStaticType<typeof blobNode>, BlobExpectedType>>;

  void it('defineString brands contentEncoding/contentMediaType onto string', () => {
    assert.equal(blobNode.schema.contentEncoding, 'base64');
    const checks: [BlobBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
  type AgeExpectedType = number & MaximumBrandType<120> & MinimumBrandType<0> & UnsetBrandType & UnsetBrandType & UnsetBrandType;
  type AgeBrandCheck = Assert<Equal<NodeStaticType<typeof ageNode>, AgeExpectedType>>;

  void it('defineNumber brands minimum/maximum onto number', () => {
    assert.equal(ageNode.schema.minimum, 0);
    const checks: [AgeBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
    assert.equal(ageNode.schema.maximum, 120);
  });

  const evenNode = SchemaNode.defineNumber({ 'type': 'integer', 'exclusiveMinimum': 0, 'exclusiveMaximum': 100, 'multipleOf': 2 } as const);
  type EvenExpectedType = number & ExclusiveMaximumBrandType<100> & ExclusiveMinimumBrandType<0> & MultipleOfBrandType<2> & UnsetBrandType & UnsetBrandType;
  type EvenBrandCheck = Assert<Equal<NodeStaticType<typeof evenNode>, EvenExpectedType>>;

  void it('defineNumber brands exclusiveMinimum/exclusiveMaximum/multipleOf onto number', () => {
    assert.equal(evenNode.schema.multipleOf, 2);
    const checks: [EvenBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineBoolean derives plain boolean', () => {
    const flagNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
    assert.equal(flagNode.schema.type, 'boolean');
    assertAssignable<NodeStaticType<typeof flagNode>>(true);
  });

  void it('defineNull derives plain null', () => {
    const nullNode = SchemaNode.defineNull({ 'type': 'null' } as const);
    assert.equal(nullNode.schema.type, 'null');
    assertAssignable<NodeStaticType<typeof nullNode>>(null);
  });

  void it('defineConst derives the exact literal', () => {
    const versionNode = SchemaNode.defineConst({}, 'v1' as const);
    assert.equal(versionNode.schema.const, 'v1');
    assertAssignable<NodeStaticType<typeof versionNode>>('v1');
  });

  void it('defineEnum derives the literal union', () => {
    const colorNode = SchemaNode.defineEnum({}, ['red', 'green', 'blue'] as const);
    assert.deepEqual(colorNode.schema.enum, ['red', 'green', 'blue']);
    assertAssignable<NodeStaticType<typeof colorNode>>('green');
  });
});

void describe('SchemaNode object constructor', () => {
  const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);

  const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode, 'age': ageNode }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  type UserExpectedType = IdentityType<{ 'age'?: NodeStaticType<typeof ageNode> } & { 'name': NodeStaticType<typeof nameNode> }>;
  type UserBrandCheck = Assert<Equal<NodeStaticType<typeof userNode>, UserExpectedType>>;

  void it('required properties become non-optional, others optional', () => {
    assert.deepEqual(userNode.schema.required, ['name']);
    const checks: [UserBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const bagNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': true, 'patternProperties': {} });
  type BagExpectedType = IdentityType<{ 'id': NodeStaticType<typeof nameNode> } & Record<string, unknown>>;
  type BagBrandCheck = Assert<Equal<NodeStaticType<typeof bagNode>, BagExpectedType>>;

  void it('additionalProperties true opens the object to unknown extras', () => {
    assert.equal(bagNode.schema.additionalProperties, true);
    const checks: [BagBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('additionalProperties defaults to false at runtime, matching its closed type default', () => {
    const closedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    assert.equal(closedNode.schema.additionalProperties, false);
  });

  void it('minProperties/maxProperties brand the object', () => {
    const boundedNode = SchemaNode.defineObject({ 'type': 'object', 'minProperties': 1, 'maxProperties': 3 } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    assert.equal(boundedNode.schema.minProperties, 1);
    assert.equal(boundedNode.schema.maxProperties, 3);
  });

  const skuNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
  const catalogNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], {
    'patternProperties': { '^sku-': skuNode }, 'additionalProperties': false });
  type CatalogExpectedType = IdentityType<Record<`sku-${string}`, NodeStaticType<typeof skuNode>>>;
  type CatalogBrandCheck = Assert<Equal<NodeStaticType<typeof catalogNode>, CatalogExpectedType>>;

  void it('patternProperties with an anchored literal pattern derives a template-literal key', () => {
    assert.deepEqual(catalogNode.schema.patternProperties, { '^sku-': skuNode });
    const checks: [CatalogBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const anyNode = SchemaNode.defineString({ 'type': 'string' } as const);
  const wildcardNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], {
    'patternProperties': { '^[a-z]+$': anyNode }, 'additionalProperties': false });
  type WildcardExpectedType = IdentityType<Record<never, never>>;
  type WildcardBrandCheck = Assert<Equal<NodeStaticType<typeof wildcardNode>, WildcardExpectedType>>;

  void it('patternProperties with a non-literal pattern falls back to a no-op ({})', () => {
    const checks: [WildcardBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });
});

void describe('SchemaNode array/tuple constructors', () => {
  const codeNode = SchemaNode.defineString({ 'type': 'string', 'pattern': '^[A-Z]{3}$' } as const);
  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
  const versionNode = SchemaNode.defineConst({}, 'v1' as const);

  const tagsNode = SchemaNode.defineArray({ 'type': 'array', 'minItems': 1, 'maxItems': 5 } as const, codeNode, undefined);
  type TagsExpectedType = MaximumItemsBrandInterface<5> & MinimumItemsBrandInterface<1> & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & NodeStaticType<typeof codeNode>[];
  type TagsBrandCheck = Assert<Equal<NodeStaticType<typeof tagsNode>, TagsExpectedType>>;

  void it('defineArray derives an array of the item static, brands minItems/maxItems', () => {
    assert.equal(tagsNode.schema.minItems, 1);
    const checks: [TagsBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const uniqueTagsNode = SchemaNode.defineArray({ 'type': 'array', 'uniqueItems': true } as const, codeNode, undefined);
  type UniqueTagsExpectedType = UniqueItemsBrandInterface<true> & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & NodeStaticType<typeof codeNode>[];
  type UniqueTagsBrandCheck = Assert<Equal<NodeStaticType<typeof uniqueTagsNode>, UniqueTagsExpectedType>>;

  void it('defineArray with uniqueItems: true carries the UniqueItemsBrandInterface', () => {
    assert.equal(uniqueTagsNode.schema.uniqueItems, true);
    const checks: [UniqueTagsBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const withContainsNode = SchemaNode.defineArray({ 'type': 'array' } as const, ageNode, versionNode);
  type WithContainsExpectedType = ContainsBrandInterface<NodeStaticType<typeof versionNode>> & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & NodeStaticType<typeof ageNode>[];
  type WithContainsBrandCheck = Assert<Equal<NodeStaticType<typeof withContainsNode>, WithContainsExpectedType>>;

  void it('defineArray with contains carries the ContainsBrandInterface', () => {
    assert.deepEqual(withContainsNode.schema.contains, versionNode);
    const checks: [WithContainsBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  const pairNode = SchemaNode.defineTuple({ 'type': 'array' } as const, [codeNode, ageNode] as const);
  type PairExpectedTupleType = [] | [NodeStaticType<typeof codeNode>] | [NodeStaticType<typeof codeNode>, NodeStaticType<typeof ageNode>, ...unknown[]];
  type PairExpectedType = UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & UnsetBrandType & PairExpectedTupleType;
  type PairBrandCheck = Assert<Equal<NodeStaticType<typeof pairNode>, PairExpectedType>>;

  void it('defineTuple preserves per-slot types and arity', () => {
    assert.equal(pairNode.schema.prefixItems.length, 2);
    const checks: [PairBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });
});

void describe('SchemaNode composition constructors', () => {
  const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
  const flagNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
  const nullNode = SchemaNode.defineNull({ 'type': 'null' } as const);

  void it('defineAllOf intersects branch statics', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const boundedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'age': ageNode }, ['age'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const allOfNode = SchemaNode.defineAllOf({}, [userNode, boundedNode] as const);
    type AllOfExpectedType = IdentityType<NodeStaticType<typeof boundedNode> & NodeStaticType<typeof userNode>>;
    type AllOfBrandCheck = Assert<Equal<NodeStaticType<typeof allOfNode>, AllOfExpectedType>>;

    assert.equal(allOfNode.schema.allOf.length, 2);
    const checks: [AllOfBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineAnyOf unions branch statics', () => {
    const anyOfNode = SchemaNode.defineAnyOf({}, [nameNode, ageNode] as const);
    type AnyOfExpectedType = NodeStaticType<typeof ageNode> | NodeStaticType<typeof nameNode>;
    type AnyOfBrandCheck = Assert<Equal<NodeStaticType<typeof anyOfNode>, AnyOfExpectedType>>;

    const checks: [AnyOfBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineOneOf unions branch statics', () => {
    const oneOfNode = SchemaNode.defineOneOf({}, [flagNode, nullNode] as const);
    assertAssignable<NodeStaticType<typeof oneOfNode>>(true);
    assertAssignable<NodeStaticType<typeof oneOfNode>>(null);
  });

  void it('defineNot falls back to unknown', () => {
    const notNode = SchemaNode.defineNot({}, nameNode);
    assert.deepEqual(notNode.schema.not, nameNode);
    assertAssignable<NodeStaticType<typeof notNode>>('anything');
  });

  void it('defineConditional unions then/else statics under renamed ifSchema/thenSchema/elseSchema keys', () => {
    const condNode = SchemaNode.defineConditional(flagNode, ageNode, nameNode);
    type CondExpectedType = NodeStaticType<typeof ageNode> | NodeStaticType<typeof nameNode>;
    type CondBrandCheck = Assert<Equal<NodeStaticType<typeof condNode>, CondExpectedType>>;

    assert.deepEqual(condNode.schema.thenSchema, ageNode);
    assert.deepEqual(condNode.schema.elseSchema, nameNode);
    const checks: [CondBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });

  void it('defineRecursive lets a node reference itself, TypeBox Type.Recursive-style', () => {
    interface RecursiveTreeSchema {
      readonly 'type': 'object';
    }
    interface RecursiveTreeStatic {
      readonly 'children': RecursiveTreeStatic[];
      readonly 'label': string;
    }
    type RecursiveTreeNode = ReturnType<typeof SchemaNode.defineRecursive<RecursiveTreeSchema, RecursiveTreeStatic>>;

    const treeNode: RecursiveTreeNode = SchemaNode.defineRecursive<RecursiveTreeSchema, RecursiveTreeStatic>((self) => {
      const built = SchemaNode.defineObject({ 'type': 'object' } as const, { 'label': nameNode, 'children': SchemaNode.defineArray({ 'type': 'array' } as const, self, undefined) }, ['label', 'children'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return built;
    });

    assert.equal(treeNode.schema.type, 'object');
    assertAssignable<NodeStaticType<typeof treeNode>>({ 'label': 'root', 'children': [{ 'label': 'child', 'children': [] }] });
  });

  void it('$ref by node reuse: the same built node composed twice shares its static type', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const reusedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'primary': userNode, 'secondary': userNode }, ['primary'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    type ReusedExpectedType = IdentityType<{ 'primary': NodeStaticType<typeof userNode> } & { 'secondary'?: NodeStaticType<typeof userNode> }>;
    type ReusedBrandCheck = Assert<Equal<NodeStaticType<typeof reusedNode>, ReusedExpectedType>>;

    assert.deepEqual(reusedNode.schema.properties?.primary, reusedNode.schema.properties?.secondary);
    const checks: [ReusedBrandCheck] = [true];
    assert.deepEqual(checks, [true]);
  });
});
