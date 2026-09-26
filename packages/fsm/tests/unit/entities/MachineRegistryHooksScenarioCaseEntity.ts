import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `MachineRegistryHooks.loop.spec.ts` scenario case shape. `expected` stays an open bag — each shape reads a different subset, coerced at the call site, never a cast. */
export namespace MachineRegistryHooksScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'duplicateId': { 'type': 'string' },
          'id': { 'type': 'string' },
          'missingId': { 'type': 'string' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'on-register', 'duplicate-no-register-hook', 'on-unregister', 'on-unregister-missing', 'on-resolve-miss',
          'on-resolve-hit-no-hook', 'hook-order', 'throwing-on-register', 'throwing-on-resolve-miss',
          'throwing-on-unregister', 'async-rejecting-register'
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
          'duplicateId': SchemaNode.defineString({ 'type': 'string' } as const),
          'id': SchemaNode.defineString({ 'type': 'string' } as const),
          'missingId': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'on-register', 'duplicate-no-register-hook', 'on-unregister', 'on-unregister-missing', 'on-resolve-miss',
        'on-resolve-hit-no-hook', 'hook-order', 'throwing-on-register', 'throwing-on-resolve-miss',
        'throwing-on-unregister', 'async-rejecting-register'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
