import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `error-code-registry.loop.spec.ts` exercises. */
export namespace ErrorCodeRegistryScenarioCaseEntity {
  const descriptorSchema = {
    'additionalProperties': false,
    'properties': {
      'code': { 'minLength': 1, 'type': 'string' },
      'description': { 'minLength': 1, 'type': 'string' },
      'retryable': { 'type': 'boolean' }
    },
    'required': ['code', 'description', 'retryable'],
    'type': 'object'
  } as const;

  const descriptorNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    ['code', 'description', 'retryable'] as const,
    { 'additionalProperties': false }
  );

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' },
          'messageIncludes': { 'type': 'string' },
          'registered': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'descriptor': descriptorSchema },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['constructor-throws', 'register-duplicate', 'register-unique'] }
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
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'messageIncludes': SchemaNode.defineString({ 'type': 'string' } as const),
          'registered': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'descriptor': descriptorNode },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['constructor-throws', 'register-duplicate', 'register-unique'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
