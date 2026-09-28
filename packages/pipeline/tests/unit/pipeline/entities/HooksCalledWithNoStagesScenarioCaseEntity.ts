import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CtxNumberStagesInputEntity } from './common/CtxNumberStagesInputEntity.js';

/** The `hooks-called-with-no-stages` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace HooksCalledWithNoStagesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
      'runCompleteCalled': { 'type': 'boolean' },
      'runStartCalled': { 'type': 'boolean' }
        },
        'required': ['runCompleteCalled', 'runStartCalled'],
        'type': 'object'
      },
      'input': CtxNumberStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'hooks-called-with-no-stages' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'runCompleteCalled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'runStartCalled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, ['runCompleteCalled', 'runStartCalled'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': CtxNumberStagesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hooks-called-with-no-stages' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
