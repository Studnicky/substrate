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

// create-and-match-cidr
const branch1Schema = ScenarioBranchBuilders.branchSchema('create-and-match-cidr', { 'additionalProperties': false, 'properties': { 'context': { 'type': 'string' }, 'definition': { 'additionalProperties': false, 'properties': { 'cidr': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['cidr', 'type'], 'type': 'object' }, 'numeric': { 'type': 'null' }, 'text': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['context', 'definition', 'numeric', 'text', 'type'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'matches': { 'type': 'boolean' } }, 'required': ['matches'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('create-and-match-cidr', SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': SchemaNode.defineString({ 'type': 'string' } as const), 'definition': SchemaNode.defineObject({ 'type': 'object' } as const, { 'cidr': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['cidr', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'numeric': SchemaNode.defineNull({ 'type': 'null' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['context', 'definition', 'numeric', 'text', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'matches': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['matches'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// match-alphabetic
const branch2Schema = ScenarioBranchBuilders.branchSchema('match-alphabetic', { 'additionalProperties': false, 'properties': { 'context': { 'type': 'string' }, 'matcher': { 'additionalProperties': false, 'properties': { 'end': { 'type': 'string' }, 'start': { 'type': 'string' } }, 'required': ['end', 'start'], 'type': 'object' }, 'numeric': { 'type': 'null' }, 'text': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['context', 'matcher', 'numeric', 'text', 'type'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'matches': { 'type': 'boolean' } }, 'required': ['matches'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('match-alphabetic', SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': SchemaNode.defineString({ 'type': 'string' } as const), 'matcher': SchemaNode.defineObject({ 'type': 'object' } as const, { 'end': SchemaNode.defineString({ 'type': 'string' } as const), 'start': SchemaNode.defineString({ 'type': 'string' } as const) }, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'numeric': SchemaNode.defineNull({ 'type': 'null' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['context', 'matcher', 'numeric', 'text', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'matches': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['matches'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// match-date
const branch3Schema = ScenarioBranchBuilders.branchSchema('match-date', { 'additionalProperties': false, 'properties': { 'context': { 'type': 'string' }, 'matcher': { 'additionalProperties': false, 'properties': { 'afterTs': { 'type': 'number' }, 'beforeTs': { 'type': 'number' } }, 'required': ['afterTs', 'beforeTs'], 'type': 'object' }, 'numeric': { 'type': 'number' }, 'text': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['context', 'matcher', 'numeric', 'text', 'type'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'matches': { 'type': 'boolean' } }, 'required': ['matches'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('match-date', SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': SchemaNode.defineString({ 'type': 'string' } as const), 'matcher': SchemaNode.defineObject({ 'type': 'object' } as const, { 'afterTs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'beforeTs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['afterTs', 'beforeTs'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'numeric': SchemaNode.defineNumber({ 'type': 'number' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['context', 'matcher', 'numeric', 'text', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'matches': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['matches'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// match-range
const branch4Schema = ScenarioBranchBuilders.branchSchema('match-range', { 'additionalProperties': false, 'properties': { 'context': { 'type': 'string' }, 'matcher': { 'additionalProperties': false, 'properties': { 'maximum': { 'type': 'number' }, 'minimum': { 'type': 'number' } }, 'required': ['maximum', 'minimum'], 'type': 'object' }, 'numeric': { 'type': 'number' }, 'text': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['context', 'matcher', 'numeric', 'text', 'type'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'matches': { 'type': 'boolean' } }, 'required': ['matches'], 'type': 'object' });
const branch4Node = ScenarioBranchBuilders.branchNode('match-range', SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': SchemaNode.defineString({ 'type': 'string' } as const), 'matcher': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximum', 'minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'numeric': SchemaNode.defineNumber({ 'type': 'number' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['context', 'matcher', 'numeric', 'text', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'matches': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['matches'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// match-semver
const branch5Schema = ScenarioBranchBuilders.branchSchema('match-semver', { 'additionalProperties': false, 'properties': { 'context': { 'type': 'string' }, 'matcher': { 'additionalProperties': false, 'properties': { 'range': { 'type': 'string' } }, 'required': ['range'], 'type': 'object' }, 'numeric': { 'type': 'null' }, 'text': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['context', 'matcher', 'numeric', 'text', 'type'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'matches': { 'type': 'boolean' } }, 'required': ['matches'], 'type': 'object' });
const branch5Node = ScenarioBranchBuilders.branchNode('match-semver', SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': SchemaNode.defineString({ 'type': 'string' } as const), 'matcher': SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': SchemaNode.defineString({ 'type': 'string' } as const) }, ['range'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'numeric': SchemaNode.defineNull({ 'type': 'null' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['context', 'matcher', 'numeric', 'text', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'matches': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['matches'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// match-sequential
const branch6Schema = ScenarioBranchBuilders.branchSchema('match-sequential', { 'additionalProperties': false, 'properties': { 'context': { 'type': 'string' }, 'matcher': { 'additionalProperties': false, 'properties': { 'maximum': { 'type': 'number' }, 'minimum': { 'type': 'number' }, 'prefix': { 'type': 'string' }, 'suffix': { 'type': 'string' } }, 'required': ['maximum', 'minimum', 'prefix', 'suffix'], 'type': 'object' }, 'numeric': { 'type': 'null' }, 'text': { 'type': 'string' }, 'type': { 'type': 'string' } }, 'required': ['context', 'matcher', 'numeric', 'text', 'type'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'matches': { 'type': 'boolean' } }, 'required': ['matches'], 'type': 'object' });
const branch6Node = ScenarioBranchBuilders.branchNode('match-sequential', SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': SchemaNode.defineString({ 'type': 'string' } as const), 'matcher': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'prefix': SchemaNode.defineString({ 'type': 'string' } as const), 'suffix': SchemaNode.defineString({ 'type': 'string' } as const) }, ['maximum', 'minimum', 'prefix', 'suffix'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'numeric': SchemaNode.defineNull({ 'type': 'null' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineString({ 'type': 'string' } as const) }, ['context', 'matcher', 'numeric', 'text', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'matches': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['matches'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace MatchersScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema,
      branch4Schema,
      branch5Schema,
      branch6Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node,
    branch5Node,
    branch6Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
