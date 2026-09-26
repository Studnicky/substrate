import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{ construction, direct }` fixture groups `ConfigurationError.loop.spec.ts` reads. */
export namespace ConfigurationErrorScenariosEntity {
  const constructionOutcomeSchema = {
    'enum': ['ConfigurationError', 'base-error', 'config.invalid', 'error', 'retryable-false', 'stack']
  } as const;

  const constructionCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'outcome': constructionOutcomeSchema
    },
    'required': ['description', 'outcome'],
    'type': 'object'
  } as const;

  const directOutcomeSchema = {
    'additionalProperties': false,
    'properties': {
      'causeMessage': { 'type': 'string' },
      'code': { 'type': 'string' },
      'message': { 'type': 'string' }
    },
    'type': 'object'
  } as const;

  const directCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'causeMessage': { 'type': 'string' },
      'description': { 'minLength': 1, 'type': 'string' },
      'message': { 'type': 'string' },
      'outcome': directOutcomeSchema,
      'shape': { 'enum': ['cause', 'json', 'message'] }
    },
    'required': ['description', 'message', 'outcome', 'shape'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'construction': { 'items': constructionCaseSchema, 'type': 'array' },
      'direct': { 'items': directCaseSchema, 'type': 'array' }
    },
    'required': ['construction', 'direct'],
    'type': 'object'
  } as const;

  const ConstructionOutcomeNode = SchemaNode.defineEnum({}, constructionOutcomeSchema.enum);
  const ConstructionCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'outcome': ConstructionOutcomeNode
    }, ['description', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const DirectOutcomeNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'code': SchemaNode.defineString({ 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'type': 'string' } as const)
    }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const DirectShapeNode = SchemaNode.defineEnum({}, directCaseSchema.properties.shape.enum);
  const DirectCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': DirectOutcomeNode,
      'shape': DirectShapeNode
    }, ['description', 'message', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'construction': SchemaNode.defineArray({ 'type': 'array' } as const, ConstructionCaseNode, undefined),
      'direct': SchemaNode.defineArray({ 'type': 'array' } as const, DirectCaseNode, undefined)
    }, ['construction', 'direct'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
