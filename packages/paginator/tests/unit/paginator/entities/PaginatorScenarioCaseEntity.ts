import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace PaginatorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'type': 'string' },
      'expected': { 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': { 'paginator': { 'type': 'object' } },
        'required': ['paginator'],
        'type': 'object'
      },
      'name': { 'type': 'string' },
      'shape': {
        'enum': [
          'accumulation-many-pages',
          'accumulation-multiple-pages',
          'accumulation-nested-pages-detached',
          'accumulation-pages-defensive-snapshot',
          'accumulation-single-page',
          'creation-has-next',
          'creation-pages-empty',
          'discriminant-narrowing',
          'exhaustion-after-exhaustion-throws',
          'exhaustion-first-page',
          'exhaustion-later-page',
          'exhaustion-undefined-cursor',
          'hook-error-async-rejection',
          'hook-error-owning-instance-isolation',
          'hook-error-throwing-enter',
          'hooks-record-exhausted-reset',
          'hooks-record-transitions',
          'hooks-rejected-after-exhaustion',
          'hooks-retain-detached-cursor-snapshot',
          'hooks-skip-hasmore-self-transition',
          'reentrancy-cross-instance',
          'reentrancy-next',
          'reentrancy-reset'
        ],
        'type': 'string'
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'paginator': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }) }, ['paginator'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'type': 'string' } as const),
    'shape': SchemaNode.defineEnum({ 'type': 'string' } as const, [
      'accumulation-many-pages',
      'accumulation-multiple-pages',
      'accumulation-nested-pages-detached',
      'accumulation-pages-defensive-snapshot',
      'accumulation-single-page',
      'creation-has-next',
      'creation-pages-empty',
      'discriminant-narrowing',
      'exhaustion-after-exhaustion-throws',
      'exhaustion-first-page',
      'exhaustion-later-page',
      'exhaustion-undefined-cursor',
      'hook-error-async-rejection',
      'hook-error-owning-instance-isolation',
      'hook-error-throwing-enter',
      'hooks-record-exhausted-reset',
      'hooks-record-transitions',
      'hooks-rejected-after-exhaustion',
      'hooks-retain-detached-cursor-snapshot',
      'hooks-skip-hasmore-self-transition',
      'reentrancy-cross-instance',
      'reentrancy-next',
      'reentrancy-reset'
    ] as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
