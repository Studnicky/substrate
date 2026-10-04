import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const InputSchema = {
  'additionalProperties': false,
  'properties': {
    'maximumLeases': { 'type': 'number' },
    'request': { 'type': 'string' },
    'workerId': { 'type': 'string' }
  },
  'required': ['maximumLeases', 'workerId'],
  'type': 'object'
} as const;

const ExpectedSchema = {
  'additionalProperties': false,
  'properties': {
    'factoryCalls': { 'type': 'number' },
    'initializedWorkers': { 'type': 'number' },
    'rejectedMessage': { 'type': 'string' },
    'response': { 'type': 'string' },
    'sameWorker': { 'type': 'boolean' },
    'terminatedBeforeClose': { 'type': 'number' },
    'terminatedWorkers': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const InputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'maximumLeases': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'request': SchemaNode.defineString({ 'type': 'string' } as const),
    'workerId': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['maximumLeases', 'workerId'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

const ExpectedNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'factoryCalls': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'initializedWorkers': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'rejectedMessage': SchemaNode.defineString({ 'type': 'string' } as const),
    'response': SchemaNode.defineString({ 'type': 'string' } as const),
    'sameWorker': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'terminatedBeforeClose': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'terminatedWorkers': SchemaNode.defineNumber({ 'type': 'number' } as const)
  },
  [] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

export namespace WorkerLeasePoolScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'expected': ExpectedSchema,
      'input': InputSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'close-during-request',
          'close-terminates-active-lease',
          'delegates-generic-transport',
          'evicts-dead-worker',
          'initializes-before-leasing',
          'reuse-and-bound'
        ]
      }
    },
    'required': ['expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'expected': ExpectedNode,
      'input': InputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'close-during-request',
        'close-terminates-active-lease',
        'delegates-generic-transport',
        'evicts-dead-worker',
        'initializes-before-leasing',
        'reuse-and-bound'
      ] as const)
    },
    ['expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
