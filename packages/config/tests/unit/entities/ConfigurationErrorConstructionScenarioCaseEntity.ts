import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 6 construction outcomes `ConfigurationError.loop.spec.ts` exercises. */
export namespace ConfigurationErrorConstructionScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'outcome': { 'const': 'ConfigurationError' }
        },
        'required': ['name', 'outcome'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'outcome': { 'const': 'base-error' }
        },
        'required': ['name', 'outcome'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'outcome': { 'const': 'config.invalid' }
        },
        'required': ['name', 'outcome'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'outcome': { 'const': 'error' }
        },
        'required': ['name', 'outcome'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'outcome': { 'const': 'retryable-false' }
        },
        'required': ['name', 'outcome'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'outcome': { 'const': 'stack' }
        },
        'required': ['name', 'outcome'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineConst({}, 'ConfigurationError' as const)
    }, ['name', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineConst({}, 'base-error' as const)
    }, ['name', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineConst({}, 'config.invalid' as const)
    }, ['name', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineConst({}, 'error' as const)
    }, ['name', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineConst({}, 'retryable-false' as const)
    }, ['name', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineConst({}, 'stack' as const)
    }, ['name', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
