import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/**
 * The scenario case shape `module-error.loop.spec.ts` exercises across 56 ModuleError
 * behaviors. Most runners are fully self-contained (hardcoded literals, not fixture-driven);
 * `input`/`expected` stay open dictionaries here since their shape varies enormously across
 * shapes and only a handful of runners actually read specific fields off them — those runners
 * narrow what they need themselves instead of asserting the whole bag's shape.
 */
export namespace ModuleErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'name': { 'minLength': 1, 'type': 'string' },
      'scenario': { 'type': 'string' },
      'shape': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['description', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'scenario': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['description', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
