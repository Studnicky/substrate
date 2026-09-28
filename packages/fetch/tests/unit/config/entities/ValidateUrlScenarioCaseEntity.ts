import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `validate-url.loop.spec.ts` scenario case shape: one branch per `shape`. */
export namespace ValidateUrlScenarioCaseEntity {
  const caseFields = {
    'description': { 'minLength': 1, 'type': 'string' },
    'input': { 'additionalProperties': false, 'properties': { 'value': BoundedJsonValueEntity.Schema }, 'required': ['value'], 'type': 'object' },
    'name': { 'minLength': 1, 'type': 'string' }
  } as const;

  const validSchema = {
    'additionalProperties': false,
    'properties': { ...caseFields, 'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'ok' } }, 'required': ['shape'], 'type': 'object' }, 'shape': { 'const': 'valid' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const invalidSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'message': { 'minLength': 1, 'type': 'string' } }, 'required': ['message'], 'type': 'object' },
      'shape': { 'enum': ['empty', 'invalid', 'non-string'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Schema = { 'oneOf': [validSchema, invalidSchema] } as const;

  const caseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': BoundedJsonValueEntity.Node }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };

  const ValidNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'ok' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'valid' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const InvalidNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineEnum({}, ['empty', 'invalid', 'non-string'] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [ValidNode, InvalidNode] as const);
  export type Type = NodeStaticType<typeof Node>;
}
