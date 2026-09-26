import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `MachineRegistry.loop.spec.ts` scenario case shape. `expected` stays an open bag — each shape reads a different subset, coerced at the call site, never a cast. */
export namespace MachineRegistryScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'name': { 'type': 'string' },
          'names': { 'items': { 'type': 'string' }, 'type': 'array' },
          'registered': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'register-get-roundtrip', 'duplicate-register-throws', 'unregister-removes-entry', 'has-check',
          'list-returns-all-registered', 'instances-isolated'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true }),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'name': SchemaNode.defineString({ 'type': 'string' } as const),
          'names': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'registered': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'register-get-roundtrip', 'duplicate-register-throws', 'unregister-removes-entry', 'has-check',
        'list-returns-all-registered', 'instances-isolated'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
