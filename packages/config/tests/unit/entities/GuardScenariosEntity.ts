import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ScenarioJsonValueNode, ScenarioJsonValueSchemaDefs } from './ScenarioJsonValueNode.js';

/** The ten `Predicates`-named groups `guard.loop.spec.ts` reads out of `guard.scenarios.json`. */
export namespace GuardScenariosEntity {
  const caseSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'input': { '$ref': '#/$defs/ScenarioJsonValue' },
      'outcome': { '$ref': '#/$defs/ScenarioJsonValue' }
    },
    'required': ['description', 'input', 'outcome'],
    'type': 'object'
  } as const;

  const groupNames = [
    'asNumber', 'asRecordArray', 'asStringOrNull', 'isBoolean', 'isFunction',
    'isNonNegativeInteger', 'isNumber', 'isObject', 'isPositiveInteger', 'isString'
  ] as const;

  export const Schema = {
    '$defs': ScenarioJsonValueSchemaDefs,
    'additionalProperties': false,
    'properties': {
      'asNumber': { 'items': caseSchema, 'type': 'array' },
      'asRecordArray': { 'items': caseSchema, 'type': 'array' },
      'asStringOrNull': { 'items': caseSchema, 'type': 'array' },
      'isBoolean': { 'items': caseSchema, 'type': 'array' },
      'isFunction': { 'items': caseSchema, 'type': 'array' },
      'isNonNegativeInteger': { 'items': caseSchema, 'type': 'array' },
      'isNumber': { 'items': caseSchema, 'type': 'array' },
      'isObject': { 'items': caseSchema, 'type': 'array' },
      'isPositiveInteger': { 'items': caseSchema, 'type': 'array' },
      'isString': { 'items': caseSchema, 'type': 'array' }
    },
    'required': groupNames,
    'type': 'object'
  } as const;

  const CaseNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'input': ScenarioJsonValueNode,
      'outcome': ScenarioJsonValueNode
    },
    ['description', 'input', 'outcome'] as const,
    { 'additionalProperties': false }
  );
  const GroupNode = SchemaNode.defineArray({ 'type': 'array' } as const, CaseNode);

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'asNumber': GroupNode,
      'asRecordArray': GroupNode,
      'asStringOrNull': GroupNode,
      'isBoolean': GroupNode,
      'isFunction': GroupNode,
      'isNonNegativeInteger': GroupNode,
      'isNumber': GroupNode,
      'isObject': GroupNode,
      'isPositiveInteger': GroupNode,
      'isString': GroupNode
    },
    groupNames,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
