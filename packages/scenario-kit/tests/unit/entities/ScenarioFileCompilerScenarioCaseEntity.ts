import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const unknownFileNode = SchemaNode.defineUnknown({});
const targetNode = SchemaNode.defineEnum({}, ['arithmetic', 'sum'] as const);
const commonNodes = {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
} as const;
const closed = { 'additionalProperties': false, 'patternProperties': {} } as const;

const sumFileValidNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  ...commonNodes,
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
    'casesLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'totalSum': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['casesLength', 'totalSum'] as const, closed),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'file': unknownFileNode }, ['file'] as const, closed),
  'shape': SchemaNode.defineConst({}, 'sum-file-valid' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, closed);

const arithmeticFileValidNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  ...commonNodes,
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
    'casesLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'totalResult': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['casesLength', 'totalResult'] as const, closed),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'file': unknownFileNode }, ['file'] as const, closed),
  'shape': SchemaNode.defineConst({}, 'arithmetic-file-valid' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, closed);

const rejectsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  ...commonNodes,
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
    'code': SchemaNode.defineString({ 'type': 'string' } as const),
    'messageIncludes': SchemaNode.defineString({ 'type': 'string' } as const)
  }, ['code', 'messageIncludes'] as const, closed),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'file': unknownFileNode, 'target': targetNode }, ['file', 'target'] as const, closed),
  'shape': SchemaNode.defineConst({}, 'rejects' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, closed);

const commonSchema = {
  'description': { 'minLength': 1, 'type': 'string' },
  'name': { 'minLength': 1, 'type': 'string' }
} as const;

/** Cases for the `ScenarioFileCompiler` spec, discriminated by `shape`. */
export namespace ScenarioFileCompilerScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          ...commonSchema,
          'expected': {
            'additionalProperties': false,
            'properties': { 'casesLength': { 'type': 'number' }, 'totalSum': { 'type': 'number' } },
            'required': ['casesLength', 'totalSum'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'file': {} }, 'required': ['file'], 'type': 'object' },
          'shape': { 'const': 'sum-file-valid' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          ...commonSchema,
          'expected': {
            'additionalProperties': false,
            'properties': { 'casesLength': { 'type': 'number' }, 'totalResult': { 'type': 'number' } },
            'required': ['casesLength', 'totalResult'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'file': {} }, 'required': ['file'], 'type': 'object' },
          'shape': { 'const': 'arithmetic-file-valid' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          ...commonSchema,
          'expected': {
            'additionalProperties': false,
            'properties': { 'code': { 'type': 'string' }, 'messageIncludes': { 'type': 'string' } },
            'required': ['code', 'messageIncludes'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'file': {}, 'target': { 'enum': ['arithmetic', 'sum'] } },
            'required': ['file', 'target'],
            'type': 'object'
          },
          'shape': { 'const': 'rejects' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [sumFileValidNode, arithmeticFileValidNode, rejectsNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
