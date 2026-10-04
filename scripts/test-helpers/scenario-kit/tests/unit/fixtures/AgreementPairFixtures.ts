import { SchemaNode } from '@studnicky/entity/types';

import type { AgreementPairInterface } from '../interfaces/AgreementPairInterface.js';

import { AddScenarioCaseEntity } from './AddScenarioCaseEntity.js';
import { ArithmeticScenarioCaseEntity } from './ArithmeticScenarioCaseEntity.js';
import { SumScenarioCaseEntity } from './SumScenarioCaseEntity.js';

/** Every Schema/Node pair the `NodeSchemaAgreement` spec names, keyed by the `pair` a scenario case references. */
export class AgreementPairFixtures {
  static readonly pairs: ReadonlyMap<string, AgreementPairInterface> = new Map<string, AgreementPairInterface>([
    ['annotation-drift', {
      'node': SchemaNode.defineEnum({}, [0, 1] as const),
      'schema': { 'description': 'Numeric flag.', 'enum': [0, 1], 'title': 'Flag' }
    }],
    ['arithmetic-entity', { 'node': ArithmeticScenarioCaseEntity.Node, 'schema': ArithmeticScenarioCaseEntity.Schema }],
    ['empty-properties', {
      'node': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'schema': { 'type': 'object' }
    }],
    ['genuine-closed-object', {
      'node': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'schema': { 'type': 'object' }
    }],
    ['genuine-type-mismatch', {
      'node': SchemaNode.defineEnum({}, ['aborted', 'active', 'idle'] as const),
      'schema': { 'enum': ['aborted', 'active', 'idle'], 'type': 'number' }
    }],
    ['mixed-type-enum', {
      'node': SchemaNode.defineEnum({}, ['aborted', 1, 'idle'] as const),
      'schema': { 'enum': ['aborted', 1, 'idle'], 'type': 'string' }
    }],
    ['nullable-type-array', {
      'node': SchemaNode.defineAnyOf({}, [
        SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        SchemaNode.defineNull({ 'minimum': 0, 'type': 'null' } as const)
      ]),
      'schema': { 'minimum': 0, 'type': ['number', 'null'] }
    }],
    ['open-additional-properties', {
      'node': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const), 'patternProperties': {} }),
      'schema': { 'type': 'object' }
    }],
    ['pattern-properties', {
      'node': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': { '^.*$': SchemaNode.defineString({ 'type': 'string' } as const) } }),
      'schema': {
        'additionalProperties': false,
        'patternProperties': { '^.*$': { 'type': 'string' } },
        'properties': {},
        'required': [],
        'type': 'object'
      }
    }],
    ['redundant-type-with-const', {
      'node': SchemaNode.defineConst({}, 'idle'),
      'schema': { 'const': 'idle', 'type': 'string' }
    }],
    ['redundant-type-with-enum', {
      'node': SchemaNode.defineEnum({}, ['aborted', 'active', 'idle'] as const),
      'schema': { 'enum': ['aborted', 'active', 'idle'], 'type': 'string' }
    }],
    ['schema-missing-property', {
      'node': AddScenarioCaseEntity.Node,
      'schema': {
        'additionalProperties': false,
        'properties': { 'description': AddScenarioCaseEntity.Schema.properties.description },
        'required': ['description'],
        'type': 'object'
      }
    }],
    ['schema-shorter-required-list', {
      'node': AddScenarioCaseEntity.Node,
      'schema': { ...AddScenarioCaseEntity.Schema, 'required': ['description', 'expected', 'input', 'name'] }
    }],
    ['sum-entity', { 'node': SumScenarioCaseEntity.Node, 'schema': SumScenarioCaseEntity.Schema }]
  ]);
}
