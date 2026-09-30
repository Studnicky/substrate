import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The `http-error.loop.spec.ts` scenario case shape: one branch per `shape`, `input` is identical across all four. */
export namespace HttpErrorScenarioCaseEntity {
  const inputSchema = {
    'additionalProperties': false,
    'properties': {
      'body': { 'type': 'string' },
      'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' },
      'statusText': { 'type': 'string' },
      'url': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['body', 'status', 'statusText', 'url'],
    'type': 'object'
  } as const;
  const InputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'body': SchemaNode.defineString({ 'type': 'string' } as const),
    'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const),
    'statusText': SchemaNode.defineString({ 'type': 'string' } as const),
    'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['body', 'status', 'statusText', 'url'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const commonCaseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } } as const;
  const commonCaseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'input': InputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };

  const errorExpectedSchema = {
    'additionalProperties': false,
    'properties': {
      'code': { 'minLength': 1, 'type': 'string' },
      'message': { 'type': 'string' },
      'retryable': { 'type': 'boolean' },
      'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' },
      'statusText': { 'type': 'string' },
      'url': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['code', 'message', 'retryable', 'status', 'statusText', 'url'],
    'type': 'object'
  } as const;
  const ErrorExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'message': SchemaNode.defineString({ 'type': 'string' } as const),
    'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const),
    'statusText': SchemaNode.defineString({ 'type': 'string' } as const),
    'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['code', 'message', 'retryable', 'status', 'statusText', 'url'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const clientErrorSchema = { 'additionalProperties': false, 'properties': { ...commonCaseFields, 'expected': errorExpectedSchema, 'shape': { 'const': 'client-error' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
  const serverErrorSchema = { 'additionalProperties': false, 'properties': { ...commonCaseFields, 'expected': errorExpectedSchema, 'shape': { 'const': 'server-error' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;

  const catchableSchema = {
    'additionalProperties': false,
    'properties': {
      ...commonCaseFields,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'caughtName': { 'const': 'HTTPError' },
          'retryable': { 'type': 'boolean' },
          'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' },
          'statusText': { 'type': 'string' },
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['caughtName', 'retryable', 'status', 'statusText', 'url'],
        'type': 'object'
      },
      'shape': { 'const': 'catchable' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const responsePropertiesSchema = {
    'additionalProperties': false,
    'properties': {
      ...commonCaseFields,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'responseUrl': { 'type': 'string' },
          'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' },
          'statusText': { 'type': 'string' },
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['responseUrl', 'status', 'statusText', 'url'],
        'type': 'object'
      },
      'shape': { 'const': 'response-properties' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Schema = { 'oneOf': [clientErrorSchema, serverErrorSchema, catchableSchema, responsePropertiesSchema] } as const;

  const ClientErrorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { ...commonCaseNodeFields, 'expected': ErrorExpectedNode, 'shape': SchemaNode.defineConst({}, 'client-error' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const ServerErrorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { ...commonCaseNodeFields, 'expected': ErrorExpectedNode, 'shape': SchemaNode.defineConst({}, 'server-error' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const CatchableNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...commonCaseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'caughtName': SchemaNode.defineConst({}, 'HTTPError' as const),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const),
      'statusText': SchemaNode.defineString({ 'type': 'string' } as const),
      'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['caughtName', 'retryable', 'status', 'statusText', 'url'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'catchable' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const ResponsePropertiesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...commonCaseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'responseUrl': SchemaNode.defineString({ 'type': 'string' } as const),
      'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const),
      'statusText': SchemaNode.defineString({ 'type': 'string' } as const),
      'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['responseUrl', 'status', 'statusText', 'url'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'response-properties' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [ClientErrorNode, ServerErrorNode, CatchableNode, ResponsePropertiesNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
