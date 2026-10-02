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

// deterministic-analyze
const branch1Schema = ScenarioBranchBuilders.branchSchema('deterministic-analyze', { 'additionalProperties': false, 'properties': { 'fixture': { 'type': 'string' } }, 'required': ['fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'identical': { 'type': 'boolean' } }, 'required': ['identical'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('deterministic-analyze', SchemaNode.defineObject({ 'type': 'object' } as const, { 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'identical': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['identical'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// deterministic-group
const branch2Schema = ScenarioBranchBuilders.branchSchema('deterministic-group', { 'additionalProperties': false, 'properties': { 'config': { 'type': 'string' }, 'fixture': { 'type': 'string' } }, 'required': ['config', 'fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'identical': { 'type': 'boolean' } }, 'required': ['identical'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('deterministic-group', SchemaNode.defineObject({ 'type': 'object' } as const, { 'config': SchemaNode.defineString({ 'type': 'string' } as const), 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['config', 'fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'identical': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['identical'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// group
const branch3Schema = ScenarioBranchBuilders.branchSchema('group', { 'additionalProperties': false, 'properties': { 'config': { 'type': 'string' }, 'fixture': { 'type': 'string' } }, 'required': ['config', 'fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'childCount': { 'type': 'number' }, 'leafCounts': { 'items': { 'type': 'number' }, 'type': 'array' }, 'values': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['childCount', 'leafCounts', 'values'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('group', SchemaNode.defineObject({ 'type': 'object' } as const, { 'config': SchemaNode.defineString({ 'type': 'string' } as const), 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['config', 'fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'childCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'leafCounts': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['childCount', 'leafCounts', 'values'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// group-empty
const branch4Schema = ScenarioBranchBuilders.branchSchema('group-empty', { 'additionalProperties': false, 'properties': { 'config': { 'type': 'string' }, 'fixture': { 'type': 'string' } }, 'required': ['config', 'fixture'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'grouped': { 'type': 'null' }, 'ungrouped': { 'items': {}, 'type': 'array' } }, 'required': ['grouped', 'ungrouped'], 'type': 'object' });
const branch4Node = ScenarioBranchBuilders.branchNode('group-empty', SchemaNode.defineObject({ 'type': 'object' } as const, { 'config': SchemaNode.defineString({ 'type': 'string' } as const), 'fixture': SchemaNode.defineString({ 'type': 'string' } as const) }, ['config', 'fixture'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'grouped': SchemaNode.defineNull({ 'type': 'null' } as const), 'ungrouped': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({}), undefined) }, ['grouped', 'ungrouped'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace DrillDownScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema,
      branch4Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
