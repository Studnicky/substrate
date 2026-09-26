import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** One `execFileSync` command outcome: either a captured stdout or a thrown error message. */
const CommandOutcomeSchema = {
  'additionalProperties': false,
  'properties': { 'error': { 'type': 'string' }, 'output': { 'type': 'string' } },
  'required': [],
  'type': 'object'
} as const;
const CommandOutcomeNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'error': SchemaNode.defineString({ 'type': 'string' } as const), 'output': SchemaNode.defineString({ 'type': 'string' } as const) },
  [] as const,
  { 'additionalProperties': false }
);

/** The single scenario case shape `GpuDetector.loop.spec.ts` exercises. */
export namespace GpuDetectorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'computeApi': { 'enum': ['cuda', 'metal', 'opencl', 'software'] },
          'name': { 'type': 'string' },
          'result': { 'enum': ['gpu', 'null'] },
          'vramMb': { 'oneOf': [{ 'type': 'number' }, { 'type': 'null' }] }
        },
        'required': ['result'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'commands': { 'additionalProperties': CommandOutcomeSchema, 'properties': {}, 'required': [], 'type': 'object' },
          'platform': { 'enum': ['darwin', 'linux', 'win32'] }
        },
        'required': ['platform'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'detect' }
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
          'computeApi': SchemaNode.defineEnum(['cuda', 'metal', 'opencl', 'software'] as const),
          'name': SchemaNode.defineString({ 'type': 'string' } as const),
          'result': SchemaNode.defineEnum(['gpu', 'null'] as const),
          'vramMb': SchemaNode.defineOneOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)])
        },
        ['result'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'commands': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': CommandOutcomeNode }),
          'platform': SchemaNode.defineEnum(['darwin', 'linux', 'win32'] as const)
        },
        ['platform'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('detect' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
