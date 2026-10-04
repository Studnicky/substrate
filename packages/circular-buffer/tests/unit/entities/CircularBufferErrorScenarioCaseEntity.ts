import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

interface JsonValueNodeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

/** `$defs.JsonValue`, TypeBox `Type.Recursive`-style: the array/object branches `$reference` back to `self`. */
const jsonValueNode = SchemaNode.defineRecursive<JsonValueNodeSchemaInterface, JSONSchema7Type>((self) => {
  const result = SchemaNode.defineAnyOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonValue', self), undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', self), 'patternProperties': {} })
  ] as const);
  return result;
});

const metadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': jsonValueNode, 'patternProperties': {} });
const metadataSchema = { 'additionalProperties': jsonValueNode.schema, 'properties': {}, 'required': [], 'type': 'object' } as const;

/** The scenario case shape `CircularBufferError.loop.spec.ts` exercises. */
export namespace CircularBufferErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'code': { 'minLength': 1, 'type': 'string' },
          'correlationId': { 'minLength': 1, 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' },
          'metadata': metadataSchema,
          'retryable': { 'type': 'boolean' }
        },
        'required': ['code', 'message', 'retryable'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'args': {
            'additionalProperties': false,
            'properties': {
              'cause': {},
              'correlationId': { 'minLength': 1, 'type': 'string' },
              'metadata': metadataSchema,
              'retryable': { 'type': 'boolean' }
            },
            'required': [],
            'type': 'object'
          },
          'message': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['default-construction', 'with-args', 'with-cause'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'correlationId': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'metadata': metadataNode,
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    }, ['code', 'message', 'retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'args': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'cause': SchemaNode.defineUnknown({} as const),
        'correlationId': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'metadata': metadataNode,
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineEnum({}, ['default-construction', 'with-args', 'with-cause'] as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
