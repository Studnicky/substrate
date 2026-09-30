import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The two `BoundedDispatcher#getBus()` scenario shapes `getters.loop.spec.ts` exercises. */
export namespace GettersScenarioCaseEntity {
  const defaultCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'busShape': { 'minLength': 1, 'type': 'string' } },
        'required': ['busShape'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'busShape': { 'minLength': 1, 'type': 'string' } },
        'required': ['busShape'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'getBus-default' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const preservesInstanceCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'sameInstance': { 'type': 'boolean' } },
        'required': ['sameInstance'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'sameInstance': { 'type': 'boolean' } },
        'required': ['sameInstance'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'getBus-preserves-instance' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Schema = { 'oneOf': [defaultCaseSchema, preservesInstanceCaseSchema] } as const;

  const DefaultCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'busShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['busShape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'busShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['busShape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'getBus-default' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const PreservesInstanceCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameInstance': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameInstance'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameInstance': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameInstance'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'getBus-preserves-instance' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [DefaultCaseNode, PreservesInstanceCaseNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
