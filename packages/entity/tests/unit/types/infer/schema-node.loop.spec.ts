import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';

/** Compiles only if `value` structurally satisfies `T` — the type-level half of each case below. */
function assertAssignable<T>(value: T): void {
  void value;
}

void describe('SchemaNode scalar constructors', () => {
  void it('defineString brands minLength/maxLength/format onto string', () => {
    const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1, 'maxLength': 64, 'format': 'email' } as const);
    assert.equal(nameNode.schema.minLength, 1);
    assert.equal(nameNode.schema.format, 'email');
    assertAssignable<NodeStaticType<typeof nameNode>>('a@b.com' as NodeStaticType<typeof nameNode>);
    assert.equal(nameNode.schema.format, 'email');
  });

  void it('defineString brands pattern onto string', () => {
    const codeNode = SchemaNode.defineString({ 'type': 'string', 'pattern': '^[A-Z]{3}$' } as const);
    assert.equal(codeNode.schema.pattern, '^[A-Z]{3}$');
    assertAssignable<NodeStaticType<typeof codeNode>>('ABC' as NodeStaticType<typeof codeNode>);
  });

  void it('defineString brands contentEncoding/contentMediaType onto string', () => {
    const blobNode = SchemaNode.defineString({ 'type': 'string', 'contentEncoding': 'base64', 'contentMediaType': 'image/png' } as const);
    assert.equal(blobNode.schema.contentEncoding, 'base64');
    assertAssignable<NodeStaticType<typeof blobNode>>('x' as NodeStaticType<typeof blobNode>);
  });

  void it('defineNumber brands minimum/maximum onto number', () => {
    const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
    assert.equal(ageNode.schema.minimum, 0);
    assertAssignable<NodeStaticType<typeof ageNode>>(30 as NodeStaticType<typeof ageNode>);
    assert.equal(ageNode.schema.maximum, 120);
  });

  void it('defineNumber brands exclusiveMinimum/exclusiveMaximum/multipleOf onto number', () => {
    const evenNode = SchemaNode.defineNumber({ 'type': 'integer', 'exclusiveMinimum': 0, 'exclusiveMaximum': 100, 'multipleOf': 2 } as const);
    assert.equal(evenNode.schema.multipleOf, 2);
    assertAssignable<NodeStaticType<typeof evenNode>>(4 as NodeStaticType<typeof evenNode>);
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
    const versionNode = SchemaNode.defineConst('v1' as const);
    assert.equal(versionNode.schema.const, 'v1');
    assertAssignable<NodeStaticType<typeof versionNode>>('v1');
  });

  void it('defineEnum derives the literal union', () => {
    const colorNode = SchemaNode.defineEnum(['red', 'green', 'blue'] as const);
    assert.deepEqual(colorNode.schema.enum, ['red', 'green', 'blue']);
    assertAssignable<NodeStaticType<typeof colorNode>>('green');
  });
});

void describe('SchemaNode object constructor', () => {
  const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);

  void it('required properties become non-optional, others optional', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode, 'age': ageNode }, ['name'] as const);
    assert.deepEqual(userNode.schema.required, ['name']);
    assertAssignable<NodeStaticType<typeof userNode>>({ 'name': 'a@b.com' as NodeStaticType<typeof nameNode> });
    assertAssignable<NodeStaticType<typeof userNode>>({
      'name': 'a@b.com' as NodeStaticType<typeof nameNode>,
      'age': 30 as NodeStaticType<typeof ageNode>
    });
  });

  void it('additionalProperties true opens the object to unknown extras', () => {
    const bagNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const, { 'additionalProperties': true });
    assert.equal(bagNode.schema.additionalProperties, true);
    assertAssignable<NodeStaticType<typeof bagNode>>({ 'id': 'x' as NodeStaticType<typeof nameNode>, 'extra': 5 });
  });

  void it('additionalProperties defaults to false at runtime, matching its closed type default', () => {
    const closedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': nameNode }, ['id'] as const);
    assert.equal(closedNode.schema.additionalProperties, false);
  });

  void it('minProperties/maxProperties brand the object', () => {
    const boundedNode = SchemaNode.defineObject(
      { 'type': 'object', 'minProperties': 1, 'maxProperties': 3 } as const,
      { 'id': nameNode },
      ['id'] as const
    );
    assert.equal(boundedNode.schema.minProperties, 1);
    assert.equal(boundedNode.schema.maxProperties, 3);
  });

  void it('patternProperties with an anchored literal pattern derives a template-literal key', () => {
    const skuNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
    const catalogNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], {
      'patternProperties': { '^sku-': skuNode }
    });
    assert.deepEqual(catalogNode.schema.patternProperties, { '^sku-': skuNode });
    assertAssignable<NodeStaticType<typeof catalogNode>>({
      'sku-1': 1 as NodeStaticType<typeof skuNode>
    } as NodeStaticType<typeof catalogNode>);
  });

  void it('patternProperties with a non-literal pattern falls back to a no-op ({})', () => {
    const anyNode = SchemaNode.defineString({ 'type': 'string' } as const);
    const wildcardNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], {
      'patternProperties': { '^[a-z]+$': anyNode }
    });
    assertAssignable<NodeStaticType<typeof wildcardNode>>({} as NodeStaticType<typeof wildcardNode>);
  });
});

void describe('SchemaNode array/tuple constructors', () => {
  const codeNode = SchemaNode.defineString({ 'type': 'string', 'pattern': '^[A-Z]{3}$' } as const);
  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
  const versionNode = SchemaNode.defineConst('v1' as const);

  void it('defineArray derives an array of the item static, brands minItems/maxItems', () => {
    const tagsNode = SchemaNode.defineArray({ 'type': 'array', 'minItems': 1, 'maxItems': 5 } as const, codeNode);
    assert.equal(tagsNode.schema.minItems, 1);
    assertAssignable<NodeStaticType<typeof tagsNode>>(['ABC' as NodeStaticType<typeof codeNode>] as NodeStaticType<typeof tagsNode>);
  });

  void it('defineArray with uniqueItems: true carries the UniqueItemsBrandInterface', () => {
    const uniqueTagsNode = SchemaNode.defineArray({ 'type': 'array', 'uniqueItems': true } as const, codeNode);
    assert.equal(uniqueTagsNode.schema.uniqueItems, true);
    assertAssignable<NodeStaticType<typeof uniqueTagsNode>>(['ABC' as NodeStaticType<typeof codeNode>] as NodeStaticType<typeof uniqueTagsNode>);
  });

  void it('defineArray with contains carries the ContainsBrandInterface', () => {
    const withContainsNode = SchemaNode.defineArray({ 'type': 'array' } as const, ageNode, versionNode);
    assert.deepEqual(withContainsNode.schema.contains, versionNode);
    assertAssignable<NodeStaticType<typeof withContainsNode>>([30 as NodeStaticType<typeof ageNode>] as NodeStaticType<typeof withContainsNode>);
  });

  void it('defineTuple preserves per-slot types and arity', () => {
    const pairNode = SchemaNode.defineTuple({ 'type': 'array' } as const, [codeNode, ageNode] as const);
    assert.equal(pairNode.schema.prefixItems.length, 2);
    assertAssignable<NodeStaticType<typeof pairNode>>(['ABC' as NodeStaticType<typeof codeNode>, 30 as NodeStaticType<typeof ageNode>]);
  });
});

void describe('SchemaNode composition constructors', () => {
  const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
  const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
  const flagNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
  const nullNode = SchemaNode.defineNull({ 'type': 'null' } as const);

  void it('defineAllOf intersects branch statics', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode }, ['name'] as const);
    const boundedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'age': ageNode }, ['age'] as const);
    const allOfNode = SchemaNode.defineAllOf([userNode, boundedNode] as const);
    assert.equal(allOfNode.schema.allOf.length, 2);
    assertAssignable<NodeStaticType<typeof allOfNode>>({
      'name': 'x' as NodeStaticType<typeof nameNode>,
      'age': 30 as NodeStaticType<typeof ageNode>
    });
  });

  void it('defineAnyOf unions branch statics', () => {
    const anyOfNode = SchemaNode.defineAnyOf([nameNode, ageNode] as const);
    assertAssignable<NodeStaticType<typeof anyOfNode>>('x' as NodeStaticType<typeof nameNode>);
    assertAssignable<NodeStaticType<typeof anyOfNode>>(30 as NodeStaticType<typeof ageNode>);
  });

  void it('defineOneOf unions branch statics', () => {
    const oneOfNode = SchemaNode.defineOneOf([flagNode, nullNode] as const);
    assertAssignable<NodeStaticType<typeof oneOfNode>>(true);
    assertAssignable<NodeStaticType<typeof oneOfNode>>(null);
  });

  void it('defineNot falls back to unknown', () => {
    const notNode = SchemaNode.defineNot(nameNode);
    assert.deepEqual(notNode.schema.not, nameNode);
    assertAssignable<NodeStaticType<typeof notNode>>('anything');
  });

  void it('defineConditional unions then/else statics under renamed ifSchema/thenSchema/elseSchema keys', () => {
    const condNode = SchemaNode.defineConditional(flagNode, ageNode, nameNode);
    assert.deepEqual(condNode.schema.thenSchema, ageNode);
    assert.deepEqual(condNode.schema.elseSchema, nameNode);
    assertAssignable<NodeStaticType<typeof condNode>>(30 as NodeStaticType<typeof ageNode>);
    assertAssignable<NodeStaticType<typeof condNode>>('x' as NodeStaticType<typeof nameNode>);
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
      const built = SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'label': nameNode, 'children': SchemaNode.defineArray({ 'type': 'array' } as const, self) },
        ['label', 'children'] as const
      );
      return built as unknown as RecursiveTreeNode;
    });

    assert.equal(treeNode.schema.type, 'object');
    assertAssignable<NodeStaticType<typeof treeNode>>({ 'label': 'root', 'children': [{ 'label': 'child', 'children': [] }] });
  });

  void it('$ref by node reuse: the same built node composed twice shares its static type', () => {
    const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode }, ['name'] as const);
    const reusedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'primary': userNode, 'secondary': userNode }, ['primary'] as const);
    assert.deepEqual(reusedNode.schema.properties?.primary, reusedNode.schema.properties?.secondary);
    assertAssignable<NodeStaticType<typeof reusedNode>>({
      'primary': { 'name': 'x' as NodeStaticType<typeof nameNode> },
      'secondary': { 'name': 'x' as NodeStaticType<typeof nameNode> }
    });
  });
});
