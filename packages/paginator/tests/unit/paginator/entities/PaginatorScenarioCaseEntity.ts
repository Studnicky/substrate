import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
