import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The scenario case shape `hook-invocation-error.loop.spec.ts` exercises for `HookInvoker`/`Retry` hook-invocation failures. */
export namespace HookInvocationErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'causeMessage': { 'minLength': 1, 'type': 'string' },
          'errorShape': { 'minLength': 1, 'type': 'string' },
          'hookName': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' },
          'unhandledRejections': { 'minimum': 0, 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'hookName': { 'minLength': 1, 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' },
          'retry': {
            'additionalProperties': false,
            'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
            'required': [],
            'type': 'object'
          }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['async-rejects-are-guarded', 'enter-call-swallows', 'hookinvoker-default-throws'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'causeMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'errorShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'unhandledRejections': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'retry': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, ['async-rejects-are-guarded', 'enter-call-swallows', 'hookinvoker-default-throws'] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
}
