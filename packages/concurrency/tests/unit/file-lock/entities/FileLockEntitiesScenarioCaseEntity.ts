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

// reject-empty-path
const branch1Schema = ScenarioBranchBuilders.branchSchema(
  'reject-empty-path',
  {
    'additionalProperties': false,
    'properties': {
      'validations': {
        'items': {
          'additionalProperties': false,
          'properties': { 'entity': { 'type': 'string' }, 'expected': { 'type': 'boolean' }, 'value': {} },
          'required': ['entity', 'expected', 'value'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['validations'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  }
);
const branch1Node = ScenarioBranchBuilders.branchNode(
  'reject-empty-path',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validations': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'entity': SchemaNode.defineString({ 'type': 'string' } as const),
            'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'value': SchemaNode.defineUnknown({})
          },
          ['entity', 'expected', 'value'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        undefined
      )
    },
    ['validations'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validationResults': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        undefined
      )
    },
    ['validationResults'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// reject-incomplete-path-state
const branch2Schema = ScenarioBranchBuilders.branchSchema(
  'reject-incomplete-path-state',
  {
    'additionalProperties': false,
    'properties': {
      'validations': {
        'items': {
          'additionalProperties': false,
          'properties': { 'entity': { 'type': 'string' }, 'expected': { 'type': 'boolean' }, 'value': {} },
          'required': ['entity', 'expected', 'value'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['validations'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  }
);
const branch2Node = ScenarioBranchBuilders.branchNode(
  'reject-incomplete-path-state',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validations': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'entity': SchemaNode.defineString({ 'type': 'string' } as const),
            'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'value': SchemaNode.defineUnknown({})
          },
          ['entity', 'expected', 'value'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        undefined
      )
    },
    ['validations'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validationResults': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        undefined
      )
    },
    ['validationResults'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// reject-non-positive-pollMs
const branch3Schema = ScenarioBranchBuilders.branchSchema(
  'reject-non-positive-pollMs',
  {
    'additionalProperties': false,
    'properties': {
      'validations': {
        'items': {
          'additionalProperties': false,
          'properties': { 'entity': { 'type': 'string' }, 'expected': { 'type': 'boolean' }, 'value': {} },
          'required': ['entity', 'expected', 'value'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['validations'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  }
);
const branch3Node = ScenarioBranchBuilders.branchNode(
  'reject-non-positive-pollMs',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validations': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'entity': SchemaNode.defineString({ 'type': 'string' } as const),
            'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'value': SchemaNode.defineUnknown({})
          },
          ['entity', 'expected', 'value'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        undefined
      )
    },
    ['validations'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validationResults': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        undefined
      )
    },
    ['validationResults'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// reject-non-positive-timeoutMs
const branch4Schema = ScenarioBranchBuilders.branchSchema(
  'reject-non-positive-timeoutMs',
  {
    'additionalProperties': false,
    'properties': {
      'validations': {
        'items': {
          'additionalProperties': false,
          'properties': { 'entity': { 'type': 'string' }, 'expected': { 'type': 'boolean' }, 'value': {} },
          'required': ['entity', 'expected', 'value'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['validations'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  }
);
const branch4Node = ScenarioBranchBuilders.branchNode(
  'reject-non-positive-timeoutMs',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validations': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'entity': SchemaNode.defineString({ 'type': 'string' } as const),
            'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'value': SchemaNode.defineUnknown({})
          },
          ['entity', 'expected', 'value'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        undefined
      )
    },
    ['validations'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validationResults': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        undefined
      )
    },
    ['validationResults'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// reject-unexpected-property
const branch5Schema = ScenarioBranchBuilders.branchSchema(
  'reject-unexpected-property',
  {
    'additionalProperties': false,
    'properties': {
      'validations': {
        'items': {
          'additionalProperties': false,
          'properties': { 'entity': { 'type': 'string' }, 'expected': { 'type': 'boolean' }, 'value': {} },
          'required': ['entity', 'expected', 'value'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['validations'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  }
);
const branch5Node = ScenarioBranchBuilders.branchNode(
  'reject-unexpected-property',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validations': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'entity': SchemaNode.defineString({ 'type': 'string' } as const),
            'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'value': SchemaNode.defineUnknown({})
          },
          ['entity', 'expected', 'value'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        undefined
      )
    },
    ['validations'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validationResults': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        undefined
      )
    },
    ['validationResults'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// valid-entities
const branch6Schema = ScenarioBranchBuilders.branchSchema(
  'valid-entities',
  {
    'additionalProperties': false,
    'properties': {
      'validations': {
        'items': {
          'additionalProperties': false,
          'properties': { 'entity': { 'type': 'string' }, 'expected': { 'type': 'boolean' }, 'value': {} },
          'required': ['entity', 'expected', 'value'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['validations'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  }
);
const branch6Node = ScenarioBranchBuilders.branchNode(
  'valid-entities',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validations': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'entity': SchemaNode.defineString({ 'type': 'string' } as const),
            'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'value': SchemaNode.defineUnknown({})
          },
          ['entity', 'expected', 'value'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        undefined
      )
    },
    ['validations'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'validationResults': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        undefined
      )
    },
    ['validationResults'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace FileLockEntitiesScenarioCaseEntity {
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

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
