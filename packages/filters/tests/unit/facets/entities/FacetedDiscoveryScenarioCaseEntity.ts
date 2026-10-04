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

// apply
const branch1Schema = ScenarioBranchBuilders.branchSchema(
  'apply',
  {
    'additionalProperties': false,
    'properties': {
      'filter': {
        'additionalProperties': false,
        'properties': {
          'color': { 'items': { 'type': 'string' }, 'type': 'array' },
          'size': { 'items': { 'type': 'string' }, 'type': 'array' }
        },
        'required': ['color', 'size'],
        'type': 'object'
      },
      'fixture': { 'type': 'string' }
    },
    'required': ['filter', 'fixture'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'match': {
        'additionalProperties': false,
        'properties': { 'color': { 'type': 'string' }, 'size': { 'type': 'string' } },
        'required': ['color', 'size'],
        'type': 'object'
      }
    },
    'required': ['count', 'match'],
    'type': 'object'
  }
);
const branch1Node = ScenarioBranchBuilders.branchNode(
  'apply',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'filter': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'color': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineString({ 'type': 'string' } as const),
            undefined
          ),
          'size': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineString({ 'type': 'string' } as const),
            undefined
          )
        },
        ['color', 'size'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      ),
      'fixture': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['filter', 'fixture'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'match': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'color': SchemaNode.defineString({ 'type': 'string' } as const),
          'size': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        ['color', 'size'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      )
    },
    ['count', 'match'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// facet-options
const branch2Schema = ScenarioBranchBuilders.branchSchema(
  'facet-options',
  {
    'additionalProperties': false,
    'properties': {
      'dimension': { 'type': 'string' },
      'filter': {
        'additionalProperties': false,
        'properties': { 'color': { 'items': { 'type': 'string' }, 'type': 'array' } },
        'required': [],
        'type': 'object'
      },
      'fixture': { 'type': 'string' }
    },
    'required': ['dimension', 'filter', 'fixture'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'options': { 'items': { 'type': 'string' }, 'type': 'array' } },
    'required': ['options'],
    'type': 'object'
  }
);
const branch2Node = ScenarioBranchBuilders.branchNode(
  'facet-options',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'dimension': SchemaNode.defineString({ 'type': 'string' } as const),
      'filter': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'color': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineString({ 'type': 'string' } as const),
            undefined
          )
        },
        [] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      ),
      'fixture': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['dimension', 'filter', 'fixture'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'options': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineString({ 'type': 'string' } as const),
        undefined
      )
    },
    ['options'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// resolve-narrows
const branch3Schema = ScenarioBranchBuilders.branchSchema(
  'resolve-narrows',
  {
    'additionalProperties': false,
    'properties': {
      'changed': { 'type': 'string' },
      'fixture': { 'type': 'string' },
      'proposed': {
        'additionalProperties': false,
        'properties': { 'color': { 'items': { 'type': 'string' }, 'type': 'array' } },
        'required': ['color'],
        'type': 'object'
      }
    },
    'required': ['changed', 'fixture', 'proposed'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': {
      'dimension': { 'type': 'string' },
      'values': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['dimension', 'values'],
    'type': 'object'
  }
);
const branch3Node = ScenarioBranchBuilders.branchNode(
  'resolve-narrows',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'changed': SchemaNode.defineString({ 'type': 'string' } as const),
      'fixture': SchemaNode.defineString({ 'type': 'string' } as const),
      'proposed': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'color': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineString({ 'type': 'string' } as const),
            undefined
          )
        },
        ['color'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      )
    },
    ['changed', 'fixture', 'proposed'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'dimension': SchemaNode.defineString({ 'type': 'string' } as const),
      'values': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineString({ 'type': 'string' } as const),
        undefined
      )
    },
    ['dimension', 'values'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// resolve-relaxes
const branch4Schema = ScenarioBranchBuilders.branchSchema(
  'resolve-relaxes',
  {
    'additionalProperties': false,
    'properties': {
      'changed': { 'type': 'string' },
      'fixture': { 'type': 'string' },
      'proposed': {
        'additionalProperties': false,
        'properties': {
          'color': { 'items': { 'type': 'string' }, 'type': 'array' },
          'size': { 'items': { 'type': 'string' }, 'type': 'array' }
        },
        'required': ['color', 'size'],
        'type': 'object'
      }
    },
    'required': ['changed', 'fixture', 'proposed'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': {
      'match': {
        'additionalProperties': false,
        'properties': { 'color': { 'type': 'string' } },
        'required': ['color'],
        'type': 'object'
      },
      'minimumCount': { 'type': 'number' }
    },
    'required': ['match', 'minimumCount'],
    'type': 'object'
  }
);
const branch4Node = ScenarioBranchBuilders.branchNode(
  'resolve-relaxes',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'changed': SchemaNode.defineString({ 'type': 'string' } as const),
      'fixture': SchemaNode.defineString({ 'type': 'string' } as const),
      'proposed': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'color': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineString({ 'type': 'string' } as const),
            undefined
          ),
          'size': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineString({ 'type': 'string' } as const),
            undefined
          )
        },
        ['color', 'size'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      )
    },
    ['changed', 'fixture', 'proposed'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'match': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'color': SchemaNode.defineString({ 'type': 'string' } as const) },
        ['color'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      ),
      'minimumCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['match', 'minimumCount'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace FacetedDiscoveryScenarioCaseEntity {
  export const Schema = {
    'oneOf': [branch1Schema, branch2Schema, branch3Schema, branch4Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
