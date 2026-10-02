import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 2 scenario shapes `entity-contracts.loop.spec.ts` exercises. */
export namespace EntityContractsScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' }
            },
            'required': ['validationResults'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'validations': { 'items': {
                'additionalProperties': false,
                'properties': {
                  'expected': { 'type': 'boolean' },
                  'value': {}
                },
                'required': ['expected', 'value'],
                'type': 'object'
              }, 'type': 'array' }
            },
            'required': ['validations'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'non-boolean-recursive-values' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' }
            },
            'required': ['validationResults'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'validations': { 'items': {
                'additionalProperties': false,
                'properties': {
                  'expected': { 'type': 'boolean' },
                  'value': {}
                },
                'required': ['expected', 'value'],
                'type': 'object'
              }, 'type': 'array' }
            },
            'required': ['validations'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'recursive-directory-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined)
      }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
          'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'value': SchemaNode.defineUnknown({} as const)
        }, ['expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
      }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'non-boolean-recursive-values' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined)
      }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
          'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'value': SchemaNode.defineUnknown({} as const)
        }, ['expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
      }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'recursive-directory-options' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
