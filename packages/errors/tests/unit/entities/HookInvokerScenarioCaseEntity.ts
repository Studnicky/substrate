import type { JSONSchema7Type } from 'json-schema';

import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = [
  'detectreentrancy-disabled',
  'detectreentrancy-direct',
  'detectreentrancy-no-throw',
  'detectreentrancy-wrapped',
  'diagnostics-async',
  'diagnostics-fallback',
  'diagnostics-null-prototype',
  'diagnostics-rich',
  'diagnostics-structured-clone',
  'diagnostics-sync',
  'invoke-async-reject',
  'invoke-async-success',
  'invoke-fire-and-forget',
  'invoke-swallow-async',
  'invoke-swallow-sync',
  'invoke-sync-success',
  'invoke-sync-throw',
  'invoke-unexpected-async',
  'invokeasync-async-success',
  'invokeasync-async-throw',
  'invokeasync-function-thenable',
  'invokeasync-sync-success',
  'invokeasync-sync-throw',
  'invokeasync-thenable',
  'invokeasync-timeout',
  'onhookerror-async-reject-invoke',
  'onhookerror-async-reject-invokeasync',
  'onhookerror-loop-guard',
  'onhookerror-sync-throw',
  'options-malformed',
  'options-no-options',
  'options-non-positive',
  'timeout-invoke-fire-and-forget',
  'timeout-invokeasync-fast',
  'timeout-no-dangling-timer',
  'timeout-sync-never-applies'
] as const;

/** Free-form fixture values (diagnostic payloads, hook return values, raw options) are registered as their own remote schema resource, matching `BaseErrorScenarioCaseEntity`'s approach. */
const JSON_VALUE_SCHEMA_ID = 'https://studnicky.github.io/substrate/schemas/errors/tests/HookInvokerJsonValue';
const JSON_VALUE_REFERENCE = `${JSON_VALUE_SCHEMA_ID}#/$defs/JsonValue`;

const jsonValueRemoteSchema = {
  '$defs': {
    'JsonValue': {
      'anyOf': [
        { 'type': 'null' },
        { 'type': 'boolean' },
        { 'type': 'number' },
        { 'type': 'string' },
        { 'items': { '$ref': '#/$defs/JsonValue' }, 'type': 'array' },
        { 'additionalProperties': { '$ref': '#/$defs/JsonValue' }, 'type': 'object' }
      ]
    }
  },
  '$id': JSON_VALUE_SCHEMA_ID
} as const;

interface JsonValueNodeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

const jsonValueNode = SchemaNode.defineRecursive<JsonValueNodeSchemaInterface, JSONSchema7Type>((self) => SchemaNode.defineAnyOf({}, [
  SchemaNode.defineNull({ 'type': 'null' } as const),
  SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineString({ 'type': 'string' } as const),
  SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonValue', self), undefined),
  SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', self), 'patternProperties': {} })
] as const));

const jsonValueReferenceSchema = { '$ref': JSON_VALUE_REFERENCE } as const;
const jsonValueReferenceNode = SchemaNode.defineReference(JSON_VALUE_REFERENCE, jsonValueNode);

/** `details`/`plain` are always JSON objects in fixture data (never a bare array or primitive), so they get the free-form-object shape rather than the fully generic JsonValue. */
const jsonObjectReferenceSchema = {
  'additionalProperties': jsonValueReferenceSchema,
  'properties': {},
  'required': [],
  'type': 'object'
} as const;

const jsonObjectReferenceNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': jsonValueReferenceNode, 'patternProperties': {} });

const diagnosticsSchema = {
  'additionalProperties': false,
  'properties': {
    'details': jsonObjectReferenceSchema,
    'items': { 'items': jsonValueReferenceSchema, 'type': 'array' },
    'plain': jsonObjectReferenceSchema
  },
  'required': [],
  'type': 'object'
} as const;

const diagnosticsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'details': jsonObjectReferenceNode,
    'items': SchemaNode.defineArray({ 'type': 'array' } as const, jsonValueReferenceNode, undefined),
    'plain': jsonObjectReferenceNode
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const invokerSchema = {
  'additionalProperties': false,
  'properties': {
    'callEvent': { 'type': 'string' },
    'causeMessage': { 'type': 'string' },
    'delayMicrotask': { 'type': 'boolean' },
    'delayMs': { 'type': 'number' },
    'diagnostics': diagnosticsSchema,
    'hookName': { 'type': 'string' },
    'innerHookName': { 'type': 'string' },
    'message': { 'type': 'string' },
    'observationDelayMs': { 'type': 'number' },
    'options': jsonValueReferenceSchema,
    'outerHookName': { 'type': 'string' },
    'returnValue': jsonValueReferenceSchema,
    'thenEvent': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const invokerNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'callEvent': SchemaNode.defineString({ 'type': 'string' } as const),
    'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
    'delayMicrotask': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'diagnostics': diagnosticsNode,
    'hookName': SchemaNode.defineString({ 'type': 'string' } as const),
    'innerHookName': SchemaNode.defineString({ 'type': 'string' } as const),
    'message': SchemaNode.defineString({ 'type': 'string' } as const),
    'observationDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'options': jsonValueReferenceNode,
    'outerHookName': SchemaNode.defineString({ 'type': 'string' } as const),
    'returnValue': jsonValueReferenceNode,
    'thenEvent': SchemaNode.defineString({ 'type': 'string' } as const)
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The scenario case shape `hook-invoker.loop.spec.ts` exercises across `HookInvoker`'s own contract. */
export namespace HookInvokerScenarioCaseEntity {
  export const RemoteSchemas = new Map<string, object | boolean>([[JSON_VALUE_SCHEMA_ID, jsonValueRemoteSchema]]);

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'afterCompletionEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
          'beforeCompletionEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
          'callCount': { 'type': 'number' },
          'causeMessage': { 'type': 'string' },
          'causeMessages': { 'items': { 'type': 'string' }, 'type': 'array' },
          'causeShape': { 'type': 'string' },
          'causeTimeoutMs': { 'type': 'number' },
          'completion': jsonValueReferenceSchema,
          'errorShape': { 'type': 'string' },
          'erroredHookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
          'events': { 'items': { 'type': 'string' }, 'type': 'array' },
          'firstCauseMessage': { 'type': 'string' },
          'firstHookName': { 'type': 'string' },
          'hookCompleted': { 'type': 'boolean' },
          'hookErrorCount': { 'type': 'number' },
          'hookName': { 'type': 'string' },
          'hookRan': { 'type': 'boolean' },
          'innerHookName': { 'type': 'string' },
          'innerRan': { 'type': 'boolean' },
          'messageIncludes': { 'items': { 'type': 'string' }, 'type': 'array' },
          'notHookInvocationError': { 'type': 'boolean' },
          'outerHookName': { 'type': 'string' },
          'outerRan': { 'type': 'boolean' },
          'terminalCauseMessage': { 'type': 'string' },
          'unhandledRejections': { 'type': 'number' },
          'valid': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'invoker': invokerSchema },
        'required': ['invoker'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'afterCompletionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'beforeCompletionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'causeMessages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'causeShape': SchemaNode.defineString({ 'type': 'string' } as const),
          'causeTimeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'completion': jsonValueReferenceNode,
          'errorShape': SchemaNode.defineString({ 'type': 'string' } as const),
          'erroredHookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'events': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'firstCauseMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'firstHookName': SchemaNode.defineString({ 'type': 'string' } as const),
          'hookCompleted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'hookName': SchemaNode.defineString({ 'type': 'string' } as const),
          'hookRan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'innerHookName': SchemaNode.defineString({ 'type': 'string' } as const),
          'innerRan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'notHookInvocationError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'outerHookName': SchemaNode.defineString({ 'type': 'string' } as const),
          'outerRan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'terminalCauseMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'invoker': invokerNode }, ['invoker'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SCENARIO_SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
