import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const throttleInputSchema = {
  'additionalProperties': false,
  'properties': { 'concurrencyLimit': { 'type': 'number' } },
  'required': [],
  'type': 'object'
} as const;

const throttleInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const concurrencyLimitExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'concurrencyLimit': { 'type': 'number' } },
  'required': ['concurrencyLimit'],
  'type': 'object'
} as const;
const concurrencyLimitExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencyLimit'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const numberResultExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'result': { 'type': 'number' } },
  'required': ['result'],
  'type': 'object'
} as const;
const numberResultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const stringResultExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'result': { 'type': 'string' } },
  'required': ['result'],
  'type': 'object'
} as const;
const stringResultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineString({ 'type': 'string' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`: the shared `{ description, expected, input, name, shape }` envelope around a shape-specific `expected`. */
class InstantiationScenarioCaseEntityBuilders {
  static caseSchema<const TShape extends string, TExpectedSchema extends Record<string, unknown>>(shape: TShape, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': expectedSchema,
        'input': {
          'additionalProperties': false,
          'properties': { 'throttle': throttleInputSchema },
          'required': ['throttle'],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static caseNode<const TShape extends string, TExpectedNode extends SchemaNodeInterface<unknown, unknown>>(shape: TShape, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': throttleInputNode }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

const createWithConfigSchema = InstantiationScenarioCaseEntityBuilders.caseSchema('create-with-config', concurrencyLimitExpectedSchema);
const createWithConfigNode = InstantiationScenarioCaseEntityBuilders.caseNode('create-with-config', concurrencyLimitExpectedNode);
const createWithDefaultSchema = InstantiationScenarioCaseEntityBuilders.caseSchema('create-with-default', concurrencyLimitExpectedSchema);
const createWithDefaultNode = InstantiationScenarioCaseEntityBuilders.caseNode('create-with-default', concurrencyLimitExpectedNode);
const executeCreatedThrottleSchema = InstantiationScenarioCaseEntityBuilders.caseSchema('execute-created-throttle', stringResultExpectedSchema);
const executeCreatedThrottleNode = InstantiationScenarioCaseEntityBuilders.caseNode('execute-created-throttle', stringResultExpectedNode);
const chainExecuteAfterCreateSchema = InstantiationScenarioCaseEntityBuilders.caseSchema('chain-execute-after-create', stringResultExpectedSchema);
const chainExecuteAfterCreateNode = InstantiationScenarioCaseEntityBuilders.caseNode('chain-execute-after-create', stringResultExpectedNode);
const executeClosureArgumentsSchema = InstantiationScenarioCaseEntityBuilders.caseSchema('execute-closure-arguments', numberResultExpectedSchema);
const executeClosureArgumentsNode = InstantiationScenarioCaseEntityBuilders.caseNode('execute-closure-arguments', numberResultExpectedNode);

/** The five scenario case shapes `instantiation.loop.spec.ts` exercises. */
export namespace InstantiationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      createWithConfigSchema, createWithDefaultSchema, executeCreatedThrottleSchema, chainExecuteAfterCreateSchema, executeClosureArgumentsSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    createWithConfigNode, createWithDefaultNode, executeCreatedThrottleNode, chainExecuteAfterCreateNode, executeClosureArgumentsNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
