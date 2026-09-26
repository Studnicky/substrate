import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ClampEventEntity } from '../../../src/entities/ClampEventEntity.js';
import { ClampRuleEntity } from '../../../src/entities/ClampRuleEntity.js';

import { ScenarioJsonValueNode, ScenarioJsonValueSchemaDefs } from './ScenarioJsonValueNode.js';

/** The `{ cases: [...] }` fixture `clampedConfig.loop.spec.ts` reads out of `clampedConfig.scenarios.json`. */
export namespace ClampedConfigScenarioCaseEntity {
  const shapeSchema = {
    'enum': [
      'absent-field-untouched', 'async-throwing-hook-is-contained', 'clamp-above-max', 'clamp-below-min',
      'default-hook-noop', 'in-range-untouched', 'nan-field-untouched-no-hook', 'non-numeric-field-untouched',
      'on-clamp-fires', 'on-clamp-multi-field', 'on-clamp-skipped-in-range', 'returns-new-object',
      'throwing-hook-preserves-input', 'throwing-hook-preserves-result', 'unruled-field-untouched'
    ]
  } as const;

  const configSchema = { 'additionalProperties': { '$ref': '#/$defs/ScenarioJsonValue' }, 'type': 'object' } as const;
  const rulesSchema = { 'additionalProperties': ClampRuleEntity.Schema, 'type': 'object' } as const;

  const inputSchema = {
    'additionalProperties': false,
    'properties': { 'config': configSchema, 'rules': rulesSchema },
    'required': ['config', 'rules'],
    'type': 'object'
  } as const;

  const expectedSchema = {
    'additionalProperties': false,
    'properties': {
      'event': ClampEventEntity.Schema,
      'eventCount': { 'type': 'number' },
      'eventFields': { 'items': { 'type': 'string' }, 'type': 'array' },
      'hookInvoked': { 'type': 'boolean' },
      'input': configSchema,
      'rejectionCount': { 'type': 'number' },
      'result': configSchema,
      'sameRef': { 'type': 'boolean' }
    },
    'required': [],
    'type': 'object'
  } as const;

  const caseSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': expectedSchema,
      'input': inputSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': shapeSchema
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Schema = {
    '$defs': ScenarioJsonValueSchemaDefs,
    'additionalProperties': false,
    'properties': { 'cases': { 'items': caseSchema, 'type': 'array' } },
    'required': ['cases'],
    'type': 'object'
  } as const;

  const ConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ScenarioJsonValueNode }
  );
  const RulesNode = SchemaNode.defineObject(
    { 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ClampRuleEntity.Node }
  );
  const InputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'config': ConfigNode, 'rules': RulesNode },
    ['config', 'rules'] as const,
    { 'additionalProperties': false }
  );
  const ExpectedNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'event': ClampEventEntity.Node,
      'eventCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'eventFields': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
      'hookInvoked': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'input': ConfigNode,
      'rejectionCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'result': ConfigNode,
      'sameRef': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    [] as const,
    { 'additionalProperties': false }
  );
  const CaseNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ExpectedNode,
      'input': InputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(shapeSchema.enum)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'cases': SchemaNode.defineArray({ 'type': 'array' } as const, CaseNode) },
    ['cases'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
