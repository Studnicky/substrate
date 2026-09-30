import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const descriptionSchema = { 'minLength': 1, 'type': 'string' } as const;
const descriptionNode = SchemaNode.defineString(descriptionSchema);

/** Builds the `{ description, expected, input, name, shape }` envelope every branch shares, varying only the discriminant and the two payloads. */
class ScenarioBranchBuilders {
  static branchSchema<
    const TShape extends string,
    const TInputSchema extends Record<string, unknown>,
    const TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': descriptionSchema,
        'expected': expectedSchema,
        'input': inputSchema,
        'name': descriptionSchema,
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': descriptionNode,
      'expected': expectedNode,
      'input': inputNode,
      'name': descriptionNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

// hash-different
const branch1Schema = ScenarioBranchBuilders.branchSchema('hash-different', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'values': { 'items': { 'additionalProperties': false, 'properties': { 'a': { 'type': 'number' } }, 'required': ['a'], 'type': 'object' }, 'type': 'array' } }, 'required': ['values'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'sameHash': { 'type': 'boolean' } }, 'required': ['sameHash'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('hash-different', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['a'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameHash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameHash'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-distinct-shapes
const branch2Schema = ScenarioBranchBuilders.branchSchema('hash-distinct-shapes', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'values': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['values'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'distinct': { 'type': 'boolean' } }, 'required': ['distinct'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('hash-distinct-shapes', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'distinct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['distinct'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-edge-values
const branch3Schema = ScenarioBranchBuilders.branchSchema('hash-edge-values', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'values': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['values'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'booleanDistinct': { 'type': 'boolean' }, 'nullDistinctFromString': { 'type': 'boolean' } }, 'required': ['booleanDistinct', 'nullDistinctFromString'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('hash-edge-values', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'booleanDistinct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'nullDistinctFromString': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['booleanDistinct', 'nullDistinctFromString'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-hex
const branch4Schema = ScenarioBranchBuilders.branchSchema('hash-hex', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'value': { 'additionalProperties': false, 'properties': { 'a': { 'type': 'number' } }, 'required': ['a'], 'type': 'object' } }, 'required': ['value'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'hexLength': { 'type': 'number' } }, 'required': ['hexLength'], 'type': 'object' });
const branch4Node = ScenarioBranchBuilders.branchNode('hash-hex', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['a'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'hexLength': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['hexLength'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-identical
const branch5Schema = ScenarioBranchBuilders.branchSchema('hash-identical', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'values': { 'items': { 'additionalProperties': false, 'properties': { 'a': { 'type': 'number' } }, 'required': ['a'], 'type': 'object' }, 'type': 'array' } }, 'required': ['values'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'sameHash': { 'type': 'boolean' } }, 'required': ['sameHash'], 'type': 'object' });
const branch5Node = ScenarioBranchBuilders.branchNode('hash-identical', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['a'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameHash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameHash'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-nested
const branch6Schema = ScenarioBranchBuilders.branchSchema('hash-nested', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'value': { 'additionalProperties': false, 'properties': { 'a': { 'additionalProperties': false, 'properties': { 'b': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['b'], 'type': 'object' } }, 'required': ['a'], 'type': 'object' } }, 'required': ['value'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'hashable': { 'type': 'boolean' } }, 'required': ['hashable'], 'type': 'object' });
const branch6Node = ScenarioBranchBuilders.branchNode('hash-nested', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineObject({ 'type': 'object' } as const, { 'b': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined) }, ['b'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['a'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'hashable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['hashable'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-order
const branch7Schema = ScenarioBranchBuilders.branchSchema('hash-order', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'values': { 'items': { 'additionalProperties': false, 'properties': { 'a': { 'type': 'number' }, 'b': { 'type': 'number' } }, 'required': ['a', 'b'], 'type': 'object' }, 'type': 'array' } }, 'required': ['values'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'sameHash': { 'type': 'boolean' } }, 'required': ['sameHash'], 'type': 'object' });
const branch7Node = ScenarioBranchBuilders.branchNode('hash-order', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'a': SchemaNode.defineNumber({ 'type': 'number' } as const), 'b': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['a', 'b'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameHash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameHash'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// hash-primitive
const branch8Schema = ScenarioBranchBuilders.branchSchema('hash-primitive', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'value': { 'type': 'number' } }, 'required': ['value'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'stringHash': { 'type': 'boolean' } }, 'required': ['stringHash'], 'type': 'object' });
const branch8Node = ScenarioBranchBuilders.branchNode('hash-primitive', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'stringHash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['stringHash'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// structural-hash-different
const branch9Schema = ScenarioBranchBuilders.branchSchema('structural-hash-different', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'base': { 'additionalProperties': false, 'properties': { 'properties': { 'additionalProperties': false, 'properties': { 'name': { 'additionalProperties': false, 'properties': { 'type': { 'type': 'string' } }, 'required': ['type'], 'type': 'object' } }, 'required': ['name'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['properties', 'type'], 'type': 'object' }, 'variant': { 'additionalProperties': false, 'properties': { 'properties': { 'additionalProperties': false, 'properties': { 'name': { 'additionalProperties': false, 'properties': { 'type': { 'type': 'string' } }, 'required': ['type'], 'type': 'object' } }, 'required': ['name'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['properties', 'type'], 'type': 'object' } }, 'required': ['base', 'variant'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'sameHash': { 'type': 'boolean' } }, 'required': ['sameHash'], 'type': 'object' });
const branch9Node = ScenarioBranchBuilders.branchNode('structural-hash-different', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'base': SchemaNode.defineObject({ 'type': 'object' } as const, { 'properties': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['properties', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'variant': SchemaNode.defineObject({ 'type': 'object' } as const, { 'properties': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['properties', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['base', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameHash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameHash'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// structural-hash-metadata
const branch10Schema = ScenarioBranchBuilders.branchSchema('structural-hash-metadata', { 'additionalProperties': false, 'properties': { 'json': { 'additionalProperties': false, 'properties': { 'base': { 'additionalProperties': false, 'properties': { 'properties': { 'additionalProperties': false, 'properties': { 'name': { 'additionalProperties': false, 'properties': { 'type': { 'type': 'string' } }, 'required': ['type'], 'type': 'object' } }, 'required': ['name'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['properties', 'type'], 'type': 'object' }, 'metadataVariant': { 'additionalProperties': false, 'properties': { '$id': { 'type': 'string' }, 'description': { 'type': 'string' }, 'properties': { 'additionalProperties': false, 'properties': { 'name': { 'additionalProperties': false, 'properties': { 'type': { 'type': 'string' } }, 'required': ['type'], 'type': 'object' } }, 'required': ['name'], 'type': 'object' }, 'title': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['$id', 'description', 'properties', 'title', 'type'], 'type': 'object' } }, 'required': ['base', 'metadataVariant'], 'type': 'object' } }, 'required': ['json'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'sameHash': { 'type': 'boolean' } }, 'required': ['sameHash'], 'type': 'object' });
const branch10Node = ScenarioBranchBuilders.branchNode('structural-hash-metadata', SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, { 'base': SchemaNode.defineObject({ 'type': 'object' } as const, { 'properties': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['properties', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'metadataVariant': SchemaNode.defineObject({ 'type': 'object' } as const, { '$id': SchemaNode.defineString({ 'type': 'string' } as const), 'description': SchemaNode.defineString({ 'type': 'string' } as const), 'properties': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'title': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['$id', 'description', 'properties', 'title', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['base', 'metadataVariant'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['json'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameHash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameHash'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace HashScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema,
      branch4Schema,
      branch5Schema,
      branch6Schema,
      branch7Schema,
      branch8Schema,
      branch9Schema,
      branch10Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node,
    branch5Node,
    branch6Node,
    branch7Node,
    branch8Node,
    branch9Node,
    branch10Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
