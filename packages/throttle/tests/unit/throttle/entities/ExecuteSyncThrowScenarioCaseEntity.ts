import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const throttleInputSchema = {
  'additionalProperties': false,
  'properties': { 'concurrencyLimit': { 'type': 'number' } },
  'required': ['concurrencyLimit'],
  'type': 'object'
} as const;

const throttleInputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) },
  ['concurrencyLimit'] as const,
  { 'additionalProperties': false }
);

const releasesSlotSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'activeCount': { 'type': 'number' }, 'recoveredResult': { 'minLength': 1, 'type': 'string' } },
      'required': ['activeCount', 'recoveredResult'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'errorMessage': { 'minLength': 1, 'type': 'string' }, 'result': { 'minLength': 1, 'type': 'string' }, 'throttle': throttleInputSchema },
      'required': ['errorMessage', 'result', 'throttle'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'sync-throw-releases-slot' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const releasesSlotNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'activeCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'recoveredResult': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
      ['activeCount', 'recoveredResult'] as const,
      { 'additionalProperties': false }
    ),
    'input': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'throttle': throttleInputNode
      },
      ['errorMessage', 'result', 'throttle'] as const,
      { 'additionalProperties': false }
    ),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst('sync-throw-releases-slot' as const)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

const rejectHookSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' },
    'input': {
      'additionalProperties': false,
      'properties': { 'errorMessage': { 'minLength': 1, 'type': 'string' }, 'failureMessage': { 'minLength': 1, 'type': 'string' }, 'throttle': throttleInputSchema },
      'required': ['errorMessage', 'failureMessage', 'throttle'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'sync-throw-reject-hook' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const rejectHookNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false }),
    'input': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'failureMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'throttle': throttleInputNode
      },
      ['errorMessage', 'failureMessage', 'throttle'] as const,
      { 'additionalProperties': false }
    ),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst('sync-throw-reject-hook' as const)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

/** The two scenario case shapes `execute-sync-throw.loop.spec.ts` exercises. */
export namespace ExecuteSyncThrowScenarioCaseEntity {
  export const Schema = { 'oneOf': [releasesSlotSchema, rejectHookSchema] } as const;

  export const Node = SchemaNode.defineOneOf([releasesSlotNode, rejectHookNode] as const);
  export type Type = NodeStaticType<typeof Node>;
}
