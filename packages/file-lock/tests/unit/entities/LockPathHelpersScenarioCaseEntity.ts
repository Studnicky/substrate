import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'basename-bare-relative', 'basename-nested',
  'dirname-absolute-multi', 'dirname-absolute-single', 'dirname-bare-relative', 'dirname-relative-directory'
] as const;

/** The single `LockPathHelpers.loop.spec.ts` scenario shape: `input.shape` duplicates the outer `shape` discriminant. */
export namespace LockPathHelpersScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'value': { 'minLength': 1, 'type': 'string' } },
        'required': ['value'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'path': { 'minLength': 1, 'type': 'string' }, 'shape': { 'enum': SHAPES } },
        'required': ['shape', 'path'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineEnum({}, SHAPES) }, ['shape', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
