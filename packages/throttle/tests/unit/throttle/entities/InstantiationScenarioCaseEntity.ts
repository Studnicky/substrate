import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const throttleInputSchema = {
  'additionalProperties': false,
  'properties': { 'concurrencyLimit': { 'type': 'number' } },
  'required': [],
  'type': 'object'
} as const;

const throttleInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const caseSchema = <const TShape extends string>(shape: TShape, expectedKey: 'concurrencyLimit' | 'result', expectedType: 'number' | 'string') => ({
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { [expectedKey]: { 'type': expectedType } },
      'required': [expectedKey],
      'type': 'object'
    },
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
}) as const;

const caseNode = <const TShape extends string>(shape: TShape, expectedKey: 'concurrencyLimit' | 'result', expectedType: 'number' | 'string') => SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { [expectedKey]: expectedType === 'number' ? SchemaNode.defineNumber({ 'type': 'number' } as const) : SchemaNode.defineString({ 'type': 'string' } as const) }, [expectedKey] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': throttleInputNode }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const createWithConfigSchema = caseSchema('create-with-config', 'concurrencyLimit', 'number');
const createWithConfigNode = caseNode('create-with-config', 'concurrencyLimit', 'number');
const createWithDefaultSchema = caseSchema('create-with-default', 'concurrencyLimit', 'number');
const createWithDefaultNode = caseNode('create-with-default', 'concurrencyLimit', 'number');
const executeCreatedThrottleSchema = caseSchema('execute-created-throttle', 'result', 'string');
const executeCreatedThrottleNode = caseNode('execute-created-throttle', 'result', 'string');
const chainExecuteAfterCreateSchema = caseSchema('chain-execute-after-create', 'result', 'string');
const chainExecuteAfterCreateNode = caseNode('chain-execute-after-create', 'result', 'string');
const executeClosureArgumentsSchema = caseSchema('execute-closure-arguments', 'result', 'number');
const executeClosureArgumentsNode = caseNode('execute-closure-arguments', 'result', 'number');

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
}
