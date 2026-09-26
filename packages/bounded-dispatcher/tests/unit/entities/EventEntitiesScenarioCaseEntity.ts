import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The scenario case shape `entities.loop.spec.ts` exercises. `value` is a deliberately open payload — tests feed both valid and invalid entity data through it. */
export namespace EventEntitiesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
        'required': ['validationResults'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'validations': {
            'items': {
              'additionalProperties': false,
              'properties': {
                'entity': { 'enum': ['BoundedDispatcherErrorEventEntity', 'BoundedDispatcherStartEventEntity', 'BoundedDispatcherSuccessEventEntity'] },
                'expected': { 'type': 'boolean' },
                'value': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' }
              },
              'required': ['entity', 'expected', 'value'],
              'type': 'object'
            },
            'type': 'array'
          }
        },
        'required': ['validations'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['entities-reject-invalid', 'entities-valid-phases'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const ValidationCaseNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'entity': SchemaNode.defineEnum(['BoundedDispatcherErrorEventEntity', 'BoundedDispatcherStartEventEntity', 'BoundedDispatcherSuccessEventEntity'] as const),
      'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'value': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true })
    },
    ['entity', 'expected', 'value'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const)) },
        ['validationResults'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, ValidationCaseNode) },
        ['validations'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['entities-reject-invalid', 'entities-valid-phases'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
