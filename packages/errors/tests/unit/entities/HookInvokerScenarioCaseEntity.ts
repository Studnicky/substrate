import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

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

const inputSchema = {
  'additionalProperties': false,
  'properties': { 'invoker': invokerSchema },
  'required': ['invoker'],
  'type': 'object'
} as const;

const inputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'invoker': invokerNode }, ['invoker'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected0Schema = {
  'additionalProperties': false,
  'properties': {
    'innerRan': { 'type': 'boolean' },
    'outerRan': { 'type': 'boolean' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected0Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'innerRan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'outerRan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected1Schema = {
  'additionalProperties': false,
  'properties': {
    'innerHookName': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected1Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'innerHookName': SchemaNode.defineString({ 'type': 'string' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected2Schema = {
  'additionalProperties': false,
  'properties': {
    'callCount': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected2Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected3Schema = {
  'additionalProperties': false,
  'properties': {
    'innerHookName': { 'type': 'string' },
    'outerHookName': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected3Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'innerHookName': SchemaNode.defineString({ 'type': 'string' } as const),
  'outerHookName': SchemaNode.defineString({ 'type': 'string' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected4Schema = {
  'additionalProperties': false,
  'properties': {
    'firstCauseMessage': { 'type': 'string' },
    'firstHookName': { 'type': 'string' },
    'hookErrorCount': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected4Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'firstCauseMessage': SchemaNode.defineString({ 'type': 'string' } as const),
  'firstHookName': SchemaNode.defineString({ 'type': 'string' } as const),
  'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected5Schema = {
  'additionalProperties': false,
  'properties': {
    'causeMessages': { 'items': { 'type': 'string' }, 'type': 'array' },
    'erroredHookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
    'unhandledRejections': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected5Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'causeMessages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'erroredHookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected6Schema = {
  'additionalProperties': false,
  'properties': {
    'completion': jsonValueReferenceSchema,
    'hookCompleted': { 'type': 'boolean' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected6Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'completion': jsonValueReferenceNode,
  'hookCompleted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected8Schema = {
  'additionalProperties': false,
  'properties': {
    'completion': jsonValueReferenceSchema,
    'erroredHookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
    'unhandledRejections': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected8Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'completion': jsonValueReferenceNode,
  'erroredHookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected9Schema = {
  'additionalProperties': false,
  'properties': {
    'completion': jsonValueReferenceSchema
  },
  'required': [],
  'type': 'object'
} as const;

const expected9Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'completion': jsonValueReferenceNode
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected10Schema = {
  'additionalProperties': false,
  'properties': {
    'completion': jsonValueReferenceSchema,
    'hookRan': { 'type': 'boolean' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected10Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'completion': jsonValueReferenceNode,
  'hookRan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected11Schema = {
  'additionalProperties': false,
  'properties': {
    'causeMessage': { 'type': 'string' },
    'errorShape': { 'type': 'string' },
    'hookName': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected11Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
  'errorShape': SchemaNode.defineString({ 'type': 'string' } as const),
  'hookName': SchemaNode.defineString({ 'type': 'string' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected12Schema = {
  'additionalProperties': false,
  'properties': {
    'erroredHookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
    'unhandledRejections': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected12Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'erroredHookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected13Schema = {
  'additionalProperties': false,
  'properties': {
    'causeMessage': { 'type': 'string' },
    'hookName': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected13Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
  'hookName': SchemaNode.defineString({ 'type': 'string' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected14Schema = {
  'additionalProperties': false,
  'properties': {
    'afterCompletionEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
    'beforeCompletionEvents': { 'items': { 'type': 'string' }, 'type': 'array' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected14Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'afterCompletionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'beforeCompletionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected15Schema = {
  'additionalProperties': false,
  'properties': {
    'events': { 'items': { 'type': 'string' }, 'type': 'array' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected15Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'events': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected16Schema = {
  'additionalProperties': false,
  'properties': {
    'causeShape': { 'type': 'string' },
    'causeTimeoutMs': { 'type': 'number' },
    'errorShape': { 'type': 'string' },
    'hookName': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected16Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'causeShape': SchemaNode.defineString({ 'type': 'string' } as const),
  'causeTimeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'errorShape': SchemaNode.defineString({ 'type': 'string' } as const),
  'hookName': SchemaNode.defineString({ 'type': 'string' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected17Schema = {
  'additionalProperties': false,
  'properties': {
    'unhandledRejections': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected17Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected18Schema = {
  'additionalProperties': false,
  'properties': {
    'terminalCauseMessage': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected18Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'terminalCauseMessage': SchemaNode.defineString({ 'type': 'string' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected19Schema = {
  'additionalProperties': false,
  'properties': {
    'messageIncludes': { 'items': { 'type': 'string' }, 'type': 'array' },
    'notHookInvocationError': { 'type': 'boolean' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected19Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'notHookInvocationError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected20Schema = {
  'additionalProperties': false,
  'properties': {
    'valid': { 'type': 'boolean' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected20Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expected21Schema = {
  'additionalProperties': false,
  'properties': {
    'causeShape': { 'type': 'string' },
    'causeTimeoutMs': { 'type': 'number' },
    'erroredHookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
    'unhandledRejections': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const expected21Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'causeShape': SchemaNode.defineString({ 'type': 'string' } as const),
  'causeTimeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'erroredHookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch of the case union from its shape literal and the payload nodes that shape uses. */
class HookInvokerScenarioCaseBuilders {
  static scenarioSchema<const TShape extends string, TExpectedSchema extends object>(shape: TShape, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': expectedSchema,
        'input': inputSchema,
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static scenarioNode<const TShape extends string, TExpectedNode extends SchemaNodeInterface<unknown, unknown>>(shape: TShape, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': inputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `hook-invoker.loop.spec.ts` exercises across `HookInvoker`'s own contract. */
export namespace HookInvokerScenarioCaseEntity {
  export const RemoteSchemas = new Map<string, object | boolean>([[JSON_VALUE_SCHEMA_ID, jsonValueRemoteSchema]]);

  export const Schema = {
    'oneOf': [
      HookInvokerScenarioCaseBuilders.scenarioSchema('detectreentrancy-disabled', expected0Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('detectreentrancy-direct', expected1Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('detectreentrancy-no-throw', expected2Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('detectreentrancy-wrapped', expected3Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('diagnostics-async', expected4Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('diagnostics-fallback', expected4Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('diagnostics-null-prototype', expected4Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('diagnostics-rich', expected4Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('diagnostics-structured-clone', expected4Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('diagnostics-sync', expected4Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-async-reject', expected5Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-async-success', expected6Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-swallow-async', expected8Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-swallow-sync', expected9Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-sync-success', expected10Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-sync-throw', expected11Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invoke-unexpected-async', expected12Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-async-success', expected6Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-async-throw', expected13Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-function-thenable', expected14Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-sync-success', expected10Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-sync-throw', expected13Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-thenable', expected15Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('invokeasync-timeout', expected16Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('onhookerror-async-reject-invoke', expected17Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('onhookerror-async-reject-invokeasync', expected18Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('onhookerror-loop-guard', expected2Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('onhookerror-sync-throw', expected19Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('options-malformed', expected20Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('options-no-options', expected10Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('options-non-positive', expected20Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('timeout-invoke-fire-and-forget', expected21Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('timeout-invokeasync-fast', expected6Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('timeout-no-dangling-timer', expected17Schema),
      HookInvokerScenarioCaseBuilders.scenarioSchema('timeout-sync-never-applies', expected10Schema)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    HookInvokerScenarioCaseBuilders.scenarioNode('detectreentrancy-disabled', expected0Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('detectreentrancy-direct', expected1Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('detectreentrancy-no-throw', expected2Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('detectreentrancy-wrapped', expected3Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('diagnostics-async', expected4Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('diagnostics-fallback', expected4Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('diagnostics-null-prototype', expected4Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('diagnostics-rich', expected4Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('diagnostics-structured-clone', expected4Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('diagnostics-sync', expected4Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-async-reject', expected5Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-async-success', expected6Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-swallow-async', expected8Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-swallow-sync', expected9Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-sync-success', expected10Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-sync-throw', expected11Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invoke-unexpected-async', expected12Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-async-success', expected6Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-async-throw', expected13Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-function-thenable', expected14Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-sync-success', expected10Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-sync-throw', expected13Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-thenable', expected15Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('invokeasync-timeout', expected16Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('onhookerror-async-reject-invoke', expected17Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('onhookerror-async-reject-invokeasync', expected18Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('onhookerror-loop-guard', expected2Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('onhookerror-sync-throw', expected19Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('options-malformed', expected20Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('options-no-options', expected10Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('options-non-positive', expected20Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('timeout-invoke-fire-and-forget', expected21Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('timeout-invokeasync-fast', expected6Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('timeout-no-dangling-timer', expected17Node),
    HookInvokerScenarioCaseBuilders.scenarioNode('timeout-sync-never-applies', expected10Node)
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, RemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, RemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, RemoteSchemas);
}
