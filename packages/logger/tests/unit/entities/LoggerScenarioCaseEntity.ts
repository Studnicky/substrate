import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { LogLevelEntity } from '../../../src/entities/LogLevelEntity.js';

/** Case shapes exercised by `Logger.loop.spec.ts`, discriminated by `shape`. */
export namespace LoggerScenarioCaseEntity {
  const nameSchema = { 'minLength': 1, 'type': 'string' } as const;
  const nameNode = SchemaNode.defineString(nameSchema);
  /** `LogLevelEntity.Node`'s own schema carries only `enum` (no `description`/`type`); this mirrors that flattened shape. */
  const logLevelEnumSchema = { 'enum': LogLevelEntity.Schema.enum } as const;

  const bareCreateDefaultSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'create-default' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareCreateInvalidMetadataSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'create-invalid-metadata' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareSnapshotMetadataAndTransportsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'snapshot-metadata-and-transports' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareFanoutMultipleTransportsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'fanout-multiple-transports' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareFanoutTransportThrowsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'fanout-transport-throws' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareFanoutOnTransportErrorThrowsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'fanout-onTransportError-throws' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareChildInheritsMetadataSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'child-inherits-metadata' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareChildOverridesMetadataSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'child-overrides-metadata' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareGrandchildMergesMetadataSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'grandchild-merges-metadata' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareChildSharesTransportsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'child-shares-transports' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareChildSnapshotsMetadataSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'child-snapshots-metadata' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareChildCreateHookSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'child-create-hook' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareRecordShapeSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'record-shape' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareRecordLevelMappingSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'record-level-mapping' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareRecordOnLogThrowsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'record-onLog-throws' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareFunctionTransportBridgeSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'function-transport-bridge' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareNoopTransportSilenceSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'noop-transport-silence' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareNoTransportsSilentSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'no-transports-silent' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnLogBeforeTransportSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onLog-before-transport' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnLogAssembledRecordSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onLog-assembled-record' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnDroppedBelowFloorSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onDropped-below-floor' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnDroppedAtFloorSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onDropped-at-floor' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnDroppedTraceDebugSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onDropped-trace-debug' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnDroppedHookErrorSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onDropped-hook-error' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnChildCreateHooksSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onChildCreate-hooks' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnChildCreateBindingsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onChildCreate-bindings' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnTransportErrorFiresSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onTransportError-fires' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnTransportErrorSucceedsSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onTransportError-succeeds' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnTransportErrorEachFailureSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onTransportError-each-failure' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnTransportErrorIsolationSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onTransportError-isolation' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnTransportErrorDetachedCauseSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onTransportError-detached-cause' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareOnTransportErrorFanoutContinuesSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'onTransportError-fanout-continues' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareAsyncOnTransportErrorSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'async-onTransportError' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareHookInvocationErrorCauseSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'hook-invocation-error-cause' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareAsyncOnLogUnhandledSchema = { 'additionalProperties': false, 'properties': { 'description': nameSchema, 'name': nameSchema, 'shape': { 'const': 'async-onLog-unhandled' } }, 'required': ['description', 'name', 'shape'], 'type': 'object' } as const;
  const bareCreateDefaultNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'create-default' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareCreateInvalidMetadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'create-invalid-metadata' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareSnapshotMetadataAndTransportsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'snapshot-metadata-and-transports' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareFanoutMultipleTransportsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'fanout-multiple-transports' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareFanoutTransportThrowsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'fanout-transport-throws' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareFanoutOnTransportErrorThrowsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'fanout-onTransportError-throws' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareChildInheritsMetadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'child-inherits-metadata' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareChildOverridesMetadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'child-overrides-metadata' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareGrandchildMergesMetadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'grandchild-merges-metadata' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareChildSharesTransportsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'child-shares-transports' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareChildSnapshotsMetadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'child-snapshots-metadata' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareChildCreateHookNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'child-create-hook' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareRecordShapeNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'record-shape' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareRecordLevelMappingNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'record-level-mapping' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareRecordOnLogThrowsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'record-onLog-throws' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareFunctionTransportBridgeNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'function-transport-bridge' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareNoopTransportSilenceNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'noop-transport-silence' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareNoTransportsSilentNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'no-transports-silent' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnLogBeforeTransportNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onLog-before-transport' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnLogAssembledRecordNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onLog-assembled-record' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnDroppedBelowFloorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onDropped-below-floor' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnDroppedAtFloorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onDropped-at-floor' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnDroppedTraceDebugNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onDropped-trace-debug' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnDroppedHookErrorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onDropped-hook-error' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnChildCreateHooksNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onChildCreate-hooks' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnChildCreateBindingsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onChildCreate-bindings' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnTransportErrorFiresNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onTransportError-fires' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnTransportErrorSucceedsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onTransportError-succeeds' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnTransportErrorEachFailureNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onTransportError-each-failure' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnTransportErrorIsolationNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onTransportError-isolation' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnTransportErrorDetachedCauseNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onTransportError-detached-cause' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareOnTransportErrorFanoutContinuesNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'onTransportError-fanout-continues' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareAsyncOnTransportErrorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'async-onTransportError' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareHookInvocationErrorCauseNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'hook-invocation-error-cause' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const bareAsyncOnLogUnhandledNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'async-onLog-unhandled' as const) }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const createStringLevelSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'level': { 'const': 'debug' },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'create-string-level' }
    },
    'required': ['description', 'level', 'name', 'shape'],
    'type': 'object'
  } as const;
  const createStringLevelNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'level': SchemaNode.defineConst({}, 'debug' as const),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'create-string-level' as const)
    }, ['description', 'level', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const createNumericLevelSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'level': logLevelEnumSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'create-numeric-level' }
    },
    'required': ['description', 'level', 'name', 'shape'],
    'type': 'object'
  } as const;
  const createNumericLevelNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'level': LogLevelEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'create-numeric-level' as const)
    }, ['description', 'level', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const createWithMetadataSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'level': logLevelEnumSchema,
      'metadata': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'create-with-metadata' }
    },
    'required': ['description', 'level', 'metadata', 'name', 'shape'],
    'type': 'object'
  } as const;
  const createWithMetadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'level': LogLevelEntity.Node,
      'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'create-with-metadata' as const)
    }, ['description', 'level', 'metadata', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const createInvalidTransportsSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'create-invalid-transports' }
    },
    'required': ['description', 'name', 'shape'],
    'type': 'object'
  } as const;
  const createInvalidTransportsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'create-invalid-transports' as const)
    }, ['description', 'expectedMessage', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const globalFloorSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expectedCount': { 'minimum': 0, 'type': 'integer' },
      'expectedLevels': { 'items': logLevelEnumSchema, 'type': 'array' },
      'level': logLevelEnumSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'global-floor' }
    },
    'required': ['description', 'expectedCount', 'expectedLevels', 'level', 'name', 'shape'],
    'type': 'object'
  } as const;
  const globalFloorNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expectedCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
      'expectedLevels': SchemaNode.defineArray({ 'type': 'array' } as const, LogLevelEntity.Node, undefined),
      'level': LogLevelEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'global-floor' as const)
    }, ['description', 'expectedCount', 'expectedLevels', 'level', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const transportFloorWarnSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expectedCounts': {
        'additionalProperties': false,
        'properties': { 'all': { 'minimum': 0, 'type': 'integer' }, 'warn': { 'minimum': 0, 'type': 'integer' } },
        'required': ['all', 'warn'],
        'type': 'object'
      },
      'expectedLevels': {
        'additionalProperties': false,
        'properties': {
          'all': { 'items': logLevelEnumSchema, 'type': 'array' },
          'warn': { 'items': logLevelEnumSchema, 'type': 'array' }
        },
        'required': ['all', 'warn'],
        'type': 'object'
      },
      'loggerLevel': logLevelEnumSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'transport-floor-warn' },
      'transportLevels': {
        'additionalProperties': false,
        'properties': { 'all': logLevelEnumSchema, 'warn': logLevelEnumSchema },
        'required': ['all', 'warn'],
        'type': 'object'
      }
    },
    'required': ['description', 'expectedCounts', 'expectedLevels', 'loggerLevel', 'name', 'shape', 'transportLevels'],
    'type': 'object'
  } as const;
  const transportFloorWarnNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expectedCounts': SchemaNode.defineObject({ 'type': 'object' } as const, { 'all': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'warn': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['all', 'warn'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'expectedLevels': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'all': SchemaNode.defineArray({ 'type': 'array' } as const, LogLevelEntity.Node, undefined),
          'warn': SchemaNode.defineArray({ 'type': 'array' } as const, LogLevelEntity.Node, undefined)
        }, ['all', 'warn'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'loggerLevel': LogLevelEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'transport-floor-warn' as const),
      'transportLevels': SchemaNode.defineObject({ 'type': 'object' } as const, { 'all': LogLevelEntity.Node, 'warn': LogLevelEntity.Node }, ['all', 'warn'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['description', 'expectedCounts', 'expectedLevels', 'loggerLevel', 'name', 'shape', 'transportLevels'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const transportFloorMixedSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expectedCounts': {
        'additionalProperties': false,
        'properties': { 'debug': { 'minimum': 0, 'type': 'integer' }, 'error': { 'minimum': 0, 'type': 'integer' } },
        'required': ['debug', 'error'],
        'type': 'object'
      },
      'loggerLevel': logLevelEnumSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'transport-floor-mixed' },
      'transportLevels': {
        'additionalProperties': false,
        'properties': { 'debug': logLevelEnumSchema, 'error': logLevelEnumSchema },
        'required': ['debug', 'error'],
        'type': 'object'
      }
    },
    'required': ['description', 'expectedCounts', 'loggerLevel', 'name', 'shape', 'transportLevels'],
    'type': 'object'
  } as const;
  const transportFloorMixedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expectedCounts': SchemaNode.defineObject({ 'type': 'object' } as const, { 'debug': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'error': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['debug', 'error'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'loggerLevel': LogLevelEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'transport-floor-mixed' as const),
      'transportLevels': SchemaNode.defineObject({ 'type': 'object' } as const, { 'debug': LogLevelEntity.Node, 'error': LogLevelEntity.Node }, ['debug', 'error'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['description', 'expectedCounts', 'loggerLevel', 'name', 'shape', 'transportLevels'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      bareCreateDefaultSchema, bareCreateInvalidMetadataSchema, bareSnapshotMetadataAndTransportsSchema, bareFanoutMultipleTransportsSchema, bareFanoutTransportThrowsSchema, bareFanoutOnTransportErrorThrowsSchema, bareChildInheritsMetadataSchema, bareChildOverridesMetadataSchema, bareGrandchildMergesMetadataSchema, bareChildSharesTransportsSchema, bareChildSnapshotsMetadataSchema, bareChildCreateHookSchema, bareRecordShapeSchema, bareRecordLevelMappingSchema, bareRecordOnLogThrowsSchema, bareFunctionTransportBridgeSchema, bareNoopTransportSilenceSchema, bareNoTransportsSilentSchema, bareOnLogBeforeTransportSchema, bareOnLogAssembledRecordSchema, bareOnDroppedBelowFloorSchema, bareOnDroppedAtFloorSchema, bareOnDroppedTraceDebugSchema, bareOnDroppedHookErrorSchema, bareOnChildCreateHooksSchema, bareOnChildCreateBindingsSchema, bareOnTransportErrorFiresSchema, bareOnTransportErrorSucceedsSchema, bareOnTransportErrorEachFailureSchema, bareOnTransportErrorIsolationSchema, bareOnTransportErrorDetachedCauseSchema, bareOnTransportErrorFanoutContinuesSchema, bareAsyncOnTransportErrorSchema, bareHookInvocationErrorCauseSchema, bareAsyncOnLogUnhandledSchema, createStringLevelSchema, createNumericLevelSchema, createWithMetadataSchema,
      createInvalidTransportsSchema, globalFloorSchema, transportFloorWarnSchema, transportFloorMixedSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    bareCreateDefaultNode, bareCreateInvalidMetadataNode, bareSnapshotMetadataAndTransportsNode, bareFanoutMultipleTransportsNode, bareFanoutTransportThrowsNode, bareFanoutOnTransportErrorThrowsNode, bareChildInheritsMetadataNode, bareChildOverridesMetadataNode, bareGrandchildMergesMetadataNode, bareChildSharesTransportsNode, bareChildSnapshotsMetadataNode, bareChildCreateHookNode, bareRecordShapeNode, bareRecordLevelMappingNode, bareRecordOnLogThrowsNode, bareFunctionTransportBridgeNode, bareNoopTransportSilenceNode, bareNoTransportsSilentNode, bareOnLogBeforeTransportNode, bareOnLogAssembledRecordNode, bareOnDroppedBelowFloorNode, bareOnDroppedAtFloorNode, bareOnDroppedTraceDebugNode, bareOnDroppedHookErrorNode, bareOnChildCreateHooksNode, bareOnChildCreateBindingsNode, bareOnTransportErrorFiresNode, bareOnTransportErrorSucceedsNode, bareOnTransportErrorEachFailureNode, bareOnTransportErrorIsolationNode, bareOnTransportErrorDetachedCauseNode, bareOnTransportErrorFanoutContinuesNode, bareAsyncOnTransportErrorNode, bareHookInvocationErrorCauseNode, bareAsyncOnLogUnhandledNode, createStringLevelNode, createNumericLevelNode, createWithMetadataNode,
    createInvalidTransportsNode, globalFloorNode, transportFloorWarnNode, transportFloorMixedNode
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
