import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CtxStringStagesInputEntity } from './common/CtxStringStagesInputEntity.js';

/** The `no-hooks-no-stages` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace NoHooksNoStagesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
      'traceLength': { 'type': 'number' }
        },
        'required': ['traceLength'],
        'type': 'object'
      },
      'input': CtxStringStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'no-hooks-no-stages' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
      'traceLength': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['traceLength'] as const,
        { 'additionalProperties': false }
      ),
      'input': CtxStringStagesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('no-hooks-no-stages' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
