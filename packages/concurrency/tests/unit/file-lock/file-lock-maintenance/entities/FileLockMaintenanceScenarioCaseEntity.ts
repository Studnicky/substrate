import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface,
  SchemaNodeInterface
} from '@studnicky/entity/interfaces';
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
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': descriptionNode,
        'expected': expectedNode,
        'input': inputNode,
        'name': descriptionNode,
        'shape': SchemaNode.defineConst({}, shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}

// conflict-and-liveness
const branch1Schema = ScenarioBranchBuilders.branchSchema(
  'conflict-and-liveness',
  {
    'additionalProperties': false,
    'properties': {
      'content': { 'type': 'string' },
      'ownerToken': { 'type': 'string' },
      'path': { 'type': 'string' }
    },
    'required': ['content', 'ownerToken', 'path'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'invalidOwnerIsAlive': { 'type': 'boolean' }, 'processIsAlive': { 'type': 'boolean' } },
    'required': ['invalidOwnerIsAlive', 'processIsAlive'],
    'type': 'object'
  }
);
const branch1Node = ScenarioBranchBuilders.branchNode(
  'conflict-and-liveness',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'content': SchemaNode.defineString({ 'type': 'string' } as const),
      'ownerToken': SchemaNode.defineString({ 'type': 'string' } as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['content', 'ownerToken', 'path'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'invalidOwnerIsAlive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'processIsAlive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    ['invalidOwnerIsAlive', 'processIsAlive'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// inspect
const branch2Schema = ScenarioBranchBuilders.branchSchema(
  'inspect',
  {
    'additionalProperties': false,
    'properties': {
      'ownerTokens': { 'items': { 'type': 'string' }, 'type': 'array' },
      'path': { 'type': 'string' }
    },
    'required': ['ownerTokens', 'path'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'lockPaths': { 'items': { 'type': 'string' }, 'type': 'array' } },
    'required': ['lockPaths'],
    'type': 'object'
  }
);
const branch2Node = ScenarioBranchBuilders.branchNode(
  'inspect',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'ownerTokens': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineString({ 'type': 'string' } as const),
        undefined
      ),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['ownerTokens', 'path'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'lockPaths': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineString({ 'type': 'string' } as const),
        undefined
      )
    },
    ['lockPaths'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// restore
const branch3Schema = ScenarioBranchBuilders.branchSchema(
  'restore',
  {
    'additionalProperties': false,
    'properties': {
      'content': { 'type': 'string' },
      'ownerToken': { 'type': 'string' },
      'path': { 'type': 'string' }
    },
    'required': ['content', 'ownerToken', 'path'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'content': { 'type': 'string' } },
    'required': ['content'],
    'type': 'object'
  }
);
const branch3Node = ScenarioBranchBuilders.branchNode(
  'restore',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'content': SchemaNode.defineString({ 'type': 'string' } as const),
      'ownerToken': SchemaNode.defineString({ 'type': 'string' } as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['content', 'ownerToken', 'path'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'content': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['content'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace FileLockMaintenanceScenarioCaseEntity {
  export const Schema = {
    'oneOf': [branch1Schema, branch2Schema, branch3Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [branch1Node, branch2Node, branch3Node] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
