import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** Every shape this suite exercises, spelled once and reused as both the runtime enum and the runner-map key type. */
export const SCENARIO_SHAPES = [
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
] as const;

/** Per-shape `input.paginator`/`expected` fields vary in both name and depth, so this entity leaves both open (validated as objects, not typed by field) and each runner narrows what it needs through the file's own field helpers. */
export namespace PaginatorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': {}, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': { 'paginator': { 'additionalProperties': {}, 'properties': {}, 'required': [], 'type': 'object' } },
        'required': ['paginator'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const) }),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'paginator': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const) })
        },
        ['paginator'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SCENARIO_SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
