import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const closed = { 'additionalProperties': false, 'patternProperties': {} } as const;

const pairInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'pair': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['pair'] as const, closed);

const matchesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'input': pairInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'matches' as const)
}, ['description', 'input', 'name', 'shape'] as const, closed);

const rejectsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'messageIncludes': SchemaNode.defineString({ 'type': 'string' } as const) }, ['messageIncludes'] as const, closed),
  'input': pairInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'rejects' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, closed);

const pairInputSchema = {
  'additionalProperties': false,
  'properties': { 'pair': { 'minLength': 1, 'type': 'string' } },
  'required': ['pair'],
  'type': 'object'
} as const;

/** Cases for the `NodeSchemaAgreement` spec, discriminated by `shape`; `pair` names a fixture Schema/Node pair. */
export namespace NodeSchemaAgreementScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'input': pairInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'matches' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'messageIncludes': { 'type': 'string' } }, 'required': ['messageIncludes'], 'type': 'object' },
          'input': pairInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [matchesNode, rejectsNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
