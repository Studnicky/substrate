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

// group-nested
const branch1Schema = ScenarioBranchBuilders.branchSchema('group-nested', { 'additionalProperties': false, 'properties': { 'path': { 'items': { 'type': 'string' }, 'type': 'array' }, 'properties': { 'items': { 'type': 'string' }, 'type': 'array' }, 'values': { 'items': { 'items': { 'type': 'string' }, 'type': 'array' }, 'type': 'array' } }, 'required': ['path', 'properties', 'values'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'firstLeafUngroupedLength': { 'type': 'number' }, 'leafValues': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['firstLeafUngroupedLength', 'leafValues'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('group-nested', SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'properties': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), undefined) }, ['path', 'properties', 'values'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'firstLeafUngroupedLength': SchemaNode.defineNumber({ 'type': 'number' } as const), 'leafValues': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['firstLeafUngroupedLength', 'leafValues'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// validate-corrupted
const branch2Schema = ScenarioBranchBuilders.branchSchema('validate-corrupted', { 'additionalProperties': false, 'properties': { 'corruptAfter': { 'type': 'number' }, 'depth': { 'type': 'number' } }, 'required': ['corruptAfter', 'depth'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'valid': { 'type': 'boolean' } }, 'required': ['valid'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('validate-corrupted', SchemaNode.defineObject({ 'type': 'object' } as const, { 'corruptAfter': SchemaNode.defineNumber({ 'type': 'number' } as const), 'depth': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['corruptAfter', 'depth'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// validate-nested
const branch3Schema = ScenarioBranchBuilders.branchSchema('validate-nested', { 'additionalProperties': false, 'properties': { 'depth': { 'type': 'number' } }, 'required': ['depth'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'valid': { 'type': 'boolean' } }, 'required': ['valid'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('validate-nested', SchemaNode.defineObject({ 'type': 'object' } as const, { 'depth': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['depth'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace DrilldownRulesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
