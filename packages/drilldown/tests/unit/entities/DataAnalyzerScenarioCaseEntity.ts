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

// cardinality-order
const branch1Schema = ScenarioBranchBuilders.branchSchema('cardinality-order', { 'additionalProperties': false, 'properties': { 'fixture': { 'type': 'string' } }, 'required': ['fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'ascending': { 'type': 'boolean' } }, 'required': ['ascending'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('cardinality-order', SchemaNode.defineObject({ 'type': 'object' } as const, { 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'ascending': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['ascending'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// empty-dataset
const branch2Schema = ScenarioBranchBuilders.branchSchema('empty-dataset', { 'additionalProperties': false, 'properties': { 'fixture': { 'type': 'string' } }, 'required': ['fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'propertyCount': { 'type': 'number' }, 'recommendedGrouping': { 'items': {}, 'type': 'array' }, 'totalRecords': { 'type': 'number' } }, 'required': ['propertyCount', 'recommendedGrouping', 'totalRecords'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('empty-dataset', SchemaNode.defineObject({ 'type': 'object' } as const, { 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'propertyCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'recommendedGrouping': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({}), undefined), 'totalRecords': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['propertyCount', 'recommendedGrouping', 'totalRecords'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// exclude-option
const branch3Schema = ScenarioBranchBuilders.branchSchema('exclude-option', { 'additionalProperties': false, 'properties': { 'exclude': { 'items': { 'type': 'string' }, 'type': 'array' }, 'fixture': { 'type': 'string' } }, 'required': ['exclude', 'fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'absent': { 'items': { 'type': 'string' }, 'type': 'array' }, 'present': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['absent', 'present'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('exclude-option', SchemaNode.defineObject({ 'type': 'object' } as const, { 'exclude': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['exclude', 'fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'absent': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'present': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['absent', 'present'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// property-absent
const branch4Schema = ScenarioBranchBuilders.branchSchema('property-absent', { 'additionalProperties': false, 'properties': { 'fixture': { 'type': 'string' }, 'property': { 'type': 'string' } }, 'required': ['fixture', 'property'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'inRecommended': { 'type': 'boolean' }, 'present': { 'type': 'boolean' } }, 'required': ['inRecommended', 'present'], 'type': 'object' });
const branch4Node = ScenarioBranchBuilders.branchNode('property-absent', SchemaNode.defineObject({ 'type': 'object' } as const, { 'fixture': SchemaNode.defineString({ 'type': 'string' } as const), 'property': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fixture', 'property'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'inRecommended': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'present': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['inRecommended', 'present'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// property-analysis
const branch5Schema = ScenarioBranchBuilders.branchSchema('property-analysis', { 'additionalProperties': false, 'properties': { 'fixture': { 'type': 'string' }, 'property': { 'type': 'string' } }, 'required': ['fixture', 'property'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'bounds': { 'additionalProperties': false, 'properties': { 'maximum': { 'type': 'number' }, 'minimum': { 'type': 'number' }, 'type': { 'type': 'string' } }, 'required': ['maximum', 'minimum', 'type'], 'type': 'object' }, 'cardinality': { 'type': 'number' }, 'coverage': { 'type': 'number' }, 'nullCount': { 'type': 'number' }, 'type': { 'type': 'string' } }, 'required': ['type'], 'type': 'object' });
const branch5Node = ScenarioBranchBuilders.branchNode('property-analysis', SchemaNode.defineObject({ 'type': 'object' } as const, { 'fixture': SchemaNode.defineString({ 'type': 'string' } as const), 'property': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fixture', 'property'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'bounds': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['maximum', 'minimum', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'cardinality': SchemaNode.defineNumber({ 'type': 'number' } as const), 'coverage': SchemaNode.defineNumber({ 'type': 'number' } as const), 'nullCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace DataAnalyzerScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema,
      branch4Schema,
      branch5Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node,
    branch5Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
