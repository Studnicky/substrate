import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { LruCacheOptionsEntity } from '../../../src/entities/LruCacheOptionsEntity.js';

const stringSchema = { 'type': 'string' } as const;
const stringNode = SchemaNode.defineString(stringSchema);
const numberSchema = { 'type': 'number' } as const;
const numberNode = SchemaNode.defineNumber(numberSchema);
const booleanSchema = { 'type': 'boolean' } as const;
const booleanNode = SchemaNode.defineBoolean(booleanSchema);
const nullSchema = { 'type': 'null' } as const;
const nullNode = SchemaNode.defineNull(nullSchema);

const nullableNumberSchema = { 'oneOf': [numberSchema, nullSchema] } as const;
const nullableNumberNode = SchemaNode.defineOneOf({}, [numberNode, nullNode] as const);
const nullableStringSchema = { 'oneOf': [stringSchema, nullSchema] } as const;
const nullableStringNode = SchemaNode.defineOneOf({}, [stringNode, nullNode] as const);

/** A cache entry pair `[key, value]`; each slot is validated as `string | number`, not a positional tuple — see `NodeSchemaAgreement` limitation noted in the report. */
const pairItemSchema = { 'oneOf': [stringSchema, numberSchema] } as const;
const pairItemNode = SchemaNode.defineOneOf({}, [stringNode, numberNode] as const);
const pairSchema = { 'items': pairItemSchema, 'maxItems': 2, 'minItems': 2, 'type': 'array' } as const;
const pairNode = SchemaNode.defineArray({ 'maxItems': 2, 'minItems': 2, 'type': 'array' } as const, pairItemNode, undefined);
const entriesSchema = { 'items': pairSchema, 'type': 'array' } as const;
const entriesNode = SchemaNode.defineArray({ 'type': 'array' } as const, pairNode, undefined);

const sizesSchema = { 'items': numberSchema, 'maxItems': 4, 'minItems': 4, 'type': 'array' } as const;
const sizesNode = SchemaNode.defineArray({ 'maxItems': 4, 'minItems': 4, 'type': 'array' } as const, numberNode, undefined);

const idKeySchema = { 'additionalProperties': false, 'properties': { 'id': numberSchema }, 'required': ['id'], 'type': 'object' } as const;
const idKeyNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': numberNode }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Deliberately unconstrained: `{ capacity: 0 }` fails `LruCacheOptionsEntity`'s own `minimum: 1` constraint on purpose. */
const invalidCacheOptionsSchema = {
  'additionalProperties': false,
  'properties': { 'capacity': { 'type': 'integer' } },
  'required': ['capacity'],
  'type': 'object'
} as const;
const invalidCacheOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'capacity': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['capacity'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builders for the repeated object shapes the branches below are assembled from. */
class LruCacheScenarioBuilders {
  static eventKeySchema<const TEvent extends string>(eventName: TEvent) {
    const result = {
      'additionalProperties': false,
      'properties': { 'event': { 'const': eventName }, 'key': stringSchema },
      'required': ['event', 'key'],
      'type': 'object'
    } as const;
    return result;
  }
  static eventKeyNode<const TEvent extends string>(eventName: TEvent) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': SchemaNode.defineConst({}, eventName), 'key': stringNode }, ['event', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }

  static eventKeyValueSchema<const TEvent extends string>(eventName: TEvent) {
    const result = {
      'additionalProperties': false,
      'properties': { 'event': { 'const': eventName }, 'key': stringSchema, 'value': numberSchema },
      'required': ['event', 'key', 'value'],
      'type': 'object'
    } as const;
    return result;
  }
  static eventKeyValueNode<const TEvent extends string>(eventName: TEvent) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': SchemaNode.defineConst({}, eventName), 'key': stringNode, 'value': numberNode }, ['event', 'key', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }

  static eventKeyReasonSchema<const TEvent extends string, const TReason extends string>(eventName: TEvent, reason: TReason) {
    const result = {
      'additionalProperties': false,
      'properties': { 'event': { 'const': eventName }, 'key': stringSchema, 'reason': { 'const': reason } },
      'required': ['event', 'key', 'reason'],
      'type': 'object'
    } as const;
    return result;
  }
  static eventKeyReasonNode<const TEvent extends string, const TReason extends string>(eventName: TEvent, reason: TReason) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': SchemaNode.defineConst({}, eventName), 'key': stringNode, 'reason': SchemaNode.defineConst({}, reason) }, ['event', 'key', 'reason'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }

  static eventCountSchema<const TEvent extends string>(eventName: TEvent) {
    const result = {
      'additionalProperties': false,
      'properties': { 'count': numberSchema, 'event': { 'const': eventName } },
      'required': ['count', 'event'],
      'type': 'object'
    } as const;
    return result;
  }
  static eventCountNode<const TEvent extends string>(eventName: TEvent) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, { 'count': numberNode, 'event': SchemaNode.defineConst({}, eventName) }, ['count', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }

  /** Builds the shared `{ description, expected, input, name, shape }` envelope every branch shares, varying only `shape` and the two payload schemas. */
  static scenarioSchema<
    const TShape extends string,
    TInputSchema extends Record<string, unknown>,
    TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
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
  static scenarioNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': inputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }

  static logEntryLengthSchema(logEntrySchema: Record<string, unknown>) {
    const result = {
      'additionalProperties': false,
      'properties': { 'logEntry': logEntrySchema, 'logLength': numberSchema },
      'required': ['logEntry', 'logLength'],
      'type': 'object'
    } as const;
    return result;
  }
}

// get-missing
const getMissingInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema }, 'required': ['cache', 'key'], 'type': 'object' } as const;
const getMissingInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode }, ['cache', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const getMissingExpectedSchema = { 'additionalProperties': false, 'properties': { 'value': nullableNumberSchema }, 'required': ['value'], 'type': 'object' } as const;
const getMissingExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': nullableNumberNode }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const getMissingSchema = LruCacheScenarioBuilders.scenarioSchema('get-missing', getMissingInputSchema, getMissingExpectedSchema);
const getMissingNode = LruCacheScenarioBuilders.scenarioNode('get-missing', getMissingInputNode, getMissingExpectedNode);

// set-get
const setGetInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'value': stringSchema }, 'required': ['cache', 'key', 'value'], 'type': 'object' } as const;
const setGetInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'value': stringNode }, ['cache', 'key', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const setGetExpectedSchema = { 'additionalProperties': false, 'properties': { 'value': stringSchema }, 'required': ['value'], 'type': 'object' } as const;
const setGetExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': stringNode }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const setGetSchema = LruCacheScenarioBuilders.scenarioSchema('set-get', setGetInputSchema, setGetExpectedSchema);
const setGetNode = LruCacheScenarioBuilders.scenarioNode('set-get', setGetInputNode, setGetExpectedNode);

// has-existing
const hasExistingInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'value': numberSchema }, 'required': ['cache', 'key', 'value'], 'type': 'object' } as const;
const hasExistingInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'value': numberNode }, ['cache', 'key', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const hasExpectedSchema = { 'additionalProperties': false, 'properties': { 'has': booleanSchema }, 'required': ['has'], 'type': 'object' } as const;
const hasExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'has': booleanNode }, ['has'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const hasExistingSchema = LruCacheScenarioBuilders.scenarioSchema('has-existing', hasExistingInputSchema, hasExpectedSchema);
const hasExistingNode = LruCacheScenarioBuilders.scenarioNode('has-existing', hasExistingInputNode, hasExpectedNode);

// has-missing
const hasMissingInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema }, 'required': ['cache', 'key'], 'type': 'object' } as const;
const hasMissingInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode }, ['cache', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const hasMissingSchema = LruCacheScenarioBuilders.scenarioSchema('has-missing', hasMissingInputSchema, hasExpectedSchema);
const hasMissingNode = LruCacheScenarioBuilders.scenarioNode('has-missing', hasMissingInputNode, hasExpectedNode);

// delete-existing
const deleteExistingInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'value': numberSchema }, 'required': ['cache', 'key', 'value'], 'type': 'object' } as const;
const deleteExistingInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'value': numberNode }, ['cache', 'key', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteExistingExpectedSchema = { 'additionalProperties': false, 'properties': { 'deleted': booleanSchema, 'value': nullableNumberSchema }, 'required': ['deleted', 'value'], 'type': 'object' } as const;
const deleteExistingExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'deleted': booleanNode, 'value': nullableNumberNode }, ['deleted', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteExistingSchema = LruCacheScenarioBuilders.scenarioSchema('delete-existing', deleteExistingInputSchema, deleteExistingExpectedSchema);
const deleteExistingNode = LruCacheScenarioBuilders.scenarioNode('delete-existing', deleteExistingInputNode, deleteExistingExpectedNode);

// delete-missing
const deleteMissingInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema }, 'required': ['cache', 'key'], 'type': 'object' } as const;
const deleteMissingInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode }, ['cache', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteMissingExpectedSchema = { 'additionalProperties': false, 'properties': { 'deleted': booleanSchema }, 'required': ['deleted'], 'type': 'object' } as const;
const deleteMissingExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'deleted': booleanNode }, ['deleted'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteMissingSchema = LruCacheScenarioBuilders.scenarioSchema('delete-missing', deleteMissingInputSchema, deleteMissingExpectedSchema);
const deleteMissingNode = LruCacheScenarioBuilders.scenarioNode('delete-missing', deleteMissingInputNode, deleteMissingExpectedNode);

// object-key-identity
const objectKeyIdentityInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'keyA': idKeySchema, 'keyB': idKeySchema, 'valueA': numberSchema, 'valueB': numberSchema },
  'required': ['cache', 'keyA', 'keyB', 'valueA', 'valueB'],
  'type': 'object'
} as const;
const objectKeyIdentityInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'keyA': idKeyNode, 'keyB': idKeyNode, 'valueA': numberNode, 'valueB': numberNode }, ['cache', 'keyA', 'keyB', 'valueA', 'valueB'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const objectKeyIdentityExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'size': numberSchema, 'valueA': numberSchema, 'valueB': numberSchema },
  'required': ['size', 'valueA', 'valueB'],
  'type': 'object'
} as const;
const objectKeyIdentityExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'size': numberNode, 'valueA': numberNode, 'valueB': numberNode }, ['size', 'valueA', 'valueB'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const objectKeyIdentitySchema = LruCacheScenarioBuilders.scenarioSchema('object-key-identity', objectKeyIdentityInputSchema, objectKeyIdentityExpectedSchema);
const objectKeyIdentityNode = LruCacheScenarioBuilders.scenarioNode('object-key-identity', objectKeyIdentityInputNode, objectKeyIdentityExpectedNode);

// size-reflects-entry-count
const sizeReflectsInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'firstKey': stringSchema, 'firstValue': numberSchema, 'secondKey': stringSchema, 'secondValue': numberSchema },
  'required': ['cache', 'firstKey', 'firstValue', 'secondKey', 'secondValue'],
  'type': 'object'
} as const;
const sizeReflectsInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'firstKey': stringNode, 'firstValue': numberNode, 'secondKey': stringNode, 'secondValue': numberNode }, ['cache', 'firstKey', 'firstValue', 'secondKey', 'secondValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const sizeReflectsExpectedSchema = { 'additionalProperties': false, 'properties': { 'sizes': sizesSchema }, 'required': ['sizes'], 'type': 'object' } as const;
const sizeReflectsExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'sizes': sizesNode }, ['sizes'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const sizeReflectsSchema = LruCacheScenarioBuilders.scenarioSchema('size-reflects-entry-count', sizeReflectsInputSchema, sizeReflectsExpectedSchema);
const sizeReflectsNode = LruCacheScenarioBuilders.scenarioNode('size-reflects-entry-count', sizeReflectsInputNode, sizeReflectsExpectedNode);

// clear-empties-cache
const clearEmptiesInputSchema = sizeReflectsInputSchema;
const clearEmptiesInputNode = sizeReflectsInputNode;
const clearEmptiesExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'firstValue': nullableNumberSchema, 'secondValue': nullableNumberSchema, 'size': numberSchema },
  'required': ['firstValue', 'secondValue', 'size'],
  'type': 'object'
} as const;
const clearEmptiesExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'firstValue': nullableNumberNode, 'secondValue': nullableNumberNode, 'size': numberNode }, ['firstValue', 'secondValue', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const clearEmptiesSchema = LruCacheScenarioBuilders.scenarioSchema('clear-empties-cache', clearEmptiesInputSchema, clearEmptiesExpectedSchema);
const clearEmptiesNode = LruCacheScenarioBuilders.scenarioNode('clear-empties-cache', clearEmptiesInputNode, clearEmptiesExpectedNode);

// lru-evicts-tail
const lruEvictsTailInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'entries': entriesSchema }, 'required': ['cache', 'entries'], 'type': 'object' } as const;
const lruEvictsTailInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'entries': entriesNode }, ['cache', 'entries'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const keptNewEvictedExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'evictedKey': stringSchema, 'evictedValue': nullableNumberSchema, 'keptKey': stringSchema, 'keptValue': numberSchema, 'newKey': stringSchema, 'newValue': numberSchema },
  'required': ['evictedKey', 'evictedValue', 'keptKey', 'keptValue', 'newKey', 'newValue'],
  'type': 'object'
} as const;
const keptNewEvictedExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'evictedKey': stringNode, 'evictedValue': nullableNumberNode, 'keptKey': stringNode, 'keptValue': numberNode, 'newKey': stringNode, 'newValue': numberNode }, ['evictedKey', 'evictedValue', 'keptKey', 'keptValue', 'newKey', 'newValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const lruEvictsTailSchema = LruCacheScenarioBuilders.scenarioSchema('lru-evicts-tail', lruEvictsTailInputSchema, keptNewEvictedExpectedSchema);
const lruEvictsTailNode = LruCacheScenarioBuilders.scenarioNode('lru-evicts-tail', lruEvictsTailInputNode, keptNewEvictedExpectedNode);

// lru-promotes-accessed-entry
const lruPromotesInputSchema = {
  'additionalProperties': false,
  'properties': {
    'cache': LruCacheOptionsEntity.Schema, 'firstKey': stringSchema, 'firstValue': numberSchema, 'promoteKey': stringSchema,
    'secondKey': stringSchema, 'secondValue': numberSchema, 'thirdKey': stringSchema, 'thirdValue': numberSchema
  },
  'required': ['cache', 'firstKey', 'firstValue', 'promoteKey', 'secondKey', 'secondValue', 'thirdKey', 'thirdValue'],
  'type': 'object'
} as const;
const lruPromotesInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'cache': LruCacheOptionsEntity.Node, 'firstKey': stringNode, 'firstValue': numberNode, 'promoteKey': stringNode,
  'secondKey': stringNode, 'secondValue': numberNode, 'thirdKey': stringNode, 'thirdValue': numberNode
}, ['cache', 'firstKey', 'firstValue', 'promoteKey', 'secondKey', 'secondValue', 'thirdKey', 'thirdValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const lruPromotesSchema = LruCacheScenarioBuilders.scenarioSchema('lru-promotes-accessed-entry', lruPromotesInputSchema, keptNewEvictedExpectedSchema);
const lruPromotesNode = LruCacheScenarioBuilders.scenarioNode('lru-promotes-accessed-entry', lruPromotesInputNode, keptNewEvictedExpectedNode);

// ttl-expires-after-delay
const ttlExpiresInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'ttlMs': numberSchema, 'value': numberSchema, 'waitMs': numberSchema },
  'required': ['cache', 'key', 'ttlMs', 'value', 'waitMs'],
  'type': 'object'
} as const;
const ttlExpiresInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'ttlMs': numberNode, 'value': numberNode, 'waitMs': numberNode }, ['cache', 'key', 'ttlMs', 'value', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const nullableValueExpectedSchema = { 'additionalProperties': false, 'properties': { 'value': nullableNumberSchema }, 'required': ['value'], 'type': 'object' } as const;
const nullableValueExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': nullableNumberNode }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const ttlExpiresSchema = LruCacheScenarioBuilders.scenarioSchema('ttl-expires-after-delay', ttlExpiresInputSchema, nullableValueExpectedSchema);
const ttlExpiresNode = LruCacheScenarioBuilders.scenarioNode('ttl-expires-after-delay', ttlExpiresInputNode, nullableValueExpectedNode);

// ttl-before-expiry
const ttlBeforeInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'value': numberSchema }, 'required': ['cache', 'key', 'value'], 'type': 'object' } as const;
const ttlBeforeInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'value': numberNode }, ['cache', 'key', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const numberValueExpectedSchema = { 'additionalProperties': false, 'properties': { 'value': numberSchema }, 'required': ['value'], 'type': 'object' } as const;
const numberValueExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': numberNode }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const ttlBeforeSchema = LruCacheScenarioBuilders.scenarioSchema('ttl-before-expiry', ttlBeforeInputSchema, numberValueExpectedSchema);
const ttlBeforeNode = LruCacheScenarioBuilders.scenarioNode('ttl-before-expiry', ttlBeforeInputNode, numberValueExpectedNode);

// entry-ttl-overrides-global
const entryTtlInputSchema = {
  'additionalProperties': false,
  'properties': {
    'cache': LruCacheOptionsEntity.Schema, 'longKey': stringSchema, 'longValue': stringSchema,
    'shortKey': stringSchema, 'shortTtlMs': numberSchema, 'shortValue': stringSchema, 'waitMs': numberSchema
  },
  'required': ['cache', 'longKey', 'longValue', 'shortKey', 'shortTtlMs', 'shortValue', 'waitMs'],
  'type': 'object'
} as const;
const entryTtlInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'cache': LruCacheOptionsEntity.Node, 'longKey': stringNode, 'longValue': stringNode,
  'shortKey': stringNode, 'shortTtlMs': numberNode, 'shortValue': stringNode, 'waitMs': numberNode
}, ['cache', 'longKey', 'longValue', 'shortKey', 'shortTtlMs', 'shortValue', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const entryTtlExpectedSchema = { 'additionalProperties': false, 'properties': { 'longValue': stringSchema, 'shortValue': nullableStringSchema }, 'required': ['longValue', 'shortValue'], 'type': 'object' } as const;
const entryTtlExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'longValue': stringNode, 'shortValue': nullableStringNode }, ['longValue', 'shortValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const entryTtlSchema = LruCacheScenarioBuilders.scenarioSchema('entry-ttl-overrides-global', entryTtlInputSchema, entryTtlExpectedSchema);
const entryTtlNode = LruCacheScenarioBuilders.scenarioNode('entry-ttl-overrides-global', entryTtlInputNode, entryTtlExpectedNode);

// on-miss / on-delete-absent shared input shape: { cache, key }
const cacheKeyInputSchema = getMissingInputSchema;
const cacheKeyInputNode = getMissingInputNode;

// on-miss
const missLogEntrySchema = LruCacheScenarioBuilders.eventKeySchema('miss');
const missLogEntryNode = LruCacheScenarioBuilders.eventKeyNode('miss');
const onMissExpectedSchema = LruCacheScenarioBuilders.logEntryLengthSchema(missLogEntrySchema);
const onMissExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': missLogEntryNode, 'logLength': numberNode }, ['logEntry', 'logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onMissSchema = LruCacheScenarioBuilders.scenarioSchema('on-miss', cacheKeyInputSchema, onMissExpectedSchema);
const onMissNode = LruCacheScenarioBuilders.scenarioNode('on-miss', cacheKeyInputNode, onMissExpectedNode);

// on-set
const cacheKeyValueInputSchema = hasExistingInputSchema;
const cacheKeyValueInputNode = hasExistingInputNode;
const setLogEntrySchema = LruCacheScenarioBuilders.eventKeySchema('set');
const setLogEntryNode = LruCacheScenarioBuilders.eventKeyNode('set');
const onSetExpectedSchema = LruCacheScenarioBuilders.logEntryLengthSchema(setLogEntrySchema);
const onSetExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': setLogEntryNode, 'logLength': numberNode }, ['logEntry', 'logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onSetSchema = LruCacheScenarioBuilders.scenarioSchema('on-set', cacheKeyValueInputSchema, onSetExpectedSchema);
const onSetNode = LruCacheScenarioBuilders.scenarioNode('on-set', cacheKeyValueInputNode, onSetExpectedNode);

// on-hit
const hitLogEntrySchema = LruCacheScenarioBuilders.eventKeyValueSchema('hit');
const hitLogEntryNode = LruCacheScenarioBuilders.eventKeyValueNode('hit');
const hitLogEntryExpectedSchema = LruCacheScenarioBuilders.logEntryLengthSchema(hitLogEntrySchema);
const hitLogEntryExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': hitLogEntryNode, 'logLength': numberNode }, ['logEntry', 'logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onHitSchema = LruCacheScenarioBuilders.scenarioSchema('on-hit', cacheKeyValueInputSchema, hitLogEntryExpectedSchema);
const onHitNode = LruCacheScenarioBuilders.scenarioNode('on-hit', cacheKeyValueInputNode, hitLogEntryExpectedNode);

// on-update
const onUpdateInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'firstValue': numberSchema, 'key': stringSchema, 'secondValue': numberSchema },
  'required': ['cache', 'firstValue', 'key', 'secondValue'],
  'type': 'object'
} as const;
const onUpdateInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'firstValue': numberNode, 'key': stringNode, 'secondValue': numberNode }, ['cache', 'firstValue', 'key', 'secondValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const updateLogEntrySchema = LruCacheScenarioBuilders.eventKeySchema('update');
const updateLogEntryNode = LruCacheScenarioBuilders.eventKeyNode('update');
const onUpdateExpectedSchema = LruCacheScenarioBuilders.logEntryLengthSchema(updateLogEntrySchema);
const onUpdateExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': updateLogEntryNode, 'logLength': numberNode }, ['logEntry', 'logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onUpdateSchema = LruCacheScenarioBuilders.scenarioSchema('on-update', onUpdateInputSchema, onUpdateExpectedSchema);
const onUpdateNode = LruCacheScenarioBuilders.scenarioNode('on-update', onUpdateInputNode, onUpdateExpectedNode);

// on-evict
const threeEntryInputSchema = {
  'additionalProperties': false,
  'properties': {
    'cache': LruCacheOptionsEntity.Schema, 'firstKey': stringSchema, 'firstValue': numberSchema,
    'secondKey': stringSchema, 'secondValue': numberSchema, 'thirdKey': stringSchema, 'thirdValue': numberSchema
  },
  'required': ['cache', 'firstKey', 'firstValue', 'secondKey', 'secondValue', 'thirdKey', 'thirdValue'],
  'type': 'object'
} as const;
const threeEntryInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'cache': LruCacheOptionsEntity.Node, 'firstKey': stringNode, 'firstValue': numberNode,
  'secondKey': stringNode, 'secondValue': numberNode, 'thirdKey': stringNode, 'thirdValue': numberNode
}, ['cache', 'firstKey', 'firstValue', 'secondKey', 'secondValue', 'thirdKey', 'thirdValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const evictLogEntrySchema = LruCacheScenarioBuilders.eventKeyReasonSchema('evict', 'capacity');
const evictLogEntryNode = LruCacheScenarioBuilders.eventKeyReasonNode('evict', 'capacity');
const onEvictExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'evictCount': numberSchema, 'evictEntry': evictLogEntrySchema },
  'required': ['evictCount', 'evictEntry'],
  'type': 'object'
} as const;
const onEvictExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'evictCount': numberNode, 'evictEntry': evictLogEntryNode }, ['evictCount', 'evictEntry'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onEvictSchema = LruCacheScenarioBuilders.scenarioSchema('on-evict', threeEntryInputSchema, onEvictExpectedSchema);
const onEvictNode = LruCacheScenarioBuilders.scenarioNode('on-evict', threeEntryInputNode, onEvictExpectedNode);

// on-delete
const deleteLogEntrySchema = LruCacheScenarioBuilders.eventKeySchema('delete');
const deleteLogEntryNode = LruCacheScenarioBuilders.eventKeyNode('delete');
const onDeleteExpectedSchema = LruCacheScenarioBuilders.logEntryLengthSchema(deleteLogEntrySchema);
const onDeleteExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': deleteLogEntryNode, 'logLength': numberNode }, ['logEntry', 'logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onDeleteSchema = LruCacheScenarioBuilders.scenarioSchema('on-delete', cacheKeyValueInputSchema, onDeleteExpectedSchema);
const onDeleteNode = LruCacheScenarioBuilders.scenarioNode('on-delete', cacheKeyValueInputNode, onDeleteExpectedNode);

// on-delete-absent
const logLengthOnlyExpectedSchema = { 'additionalProperties': false, 'properties': { 'logLength': numberSchema }, 'required': ['logLength'], 'type': 'object' } as const;
const logLengthOnlyExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logLength': numberNode }, ['logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onDeleteAbsentSchema = LruCacheScenarioBuilders.scenarioSchema('on-delete-absent', cacheKeyInputSchema, logLengthOnlyExpectedSchema);
const onDeleteAbsentNode = LruCacheScenarioBuilders.scenarioNode('on-delete-absent', cacheKeyInputNode, logLengthOnlyExpectedNode);

// on-clear
const cacheEntriesInputSchema = lruEvictsTailInputSchema;
const cacheEntriesInputNode = lruEvictsTailInputNode;
const clearLogEntrySchema = LruCacheScenarioBuilders.eventCountSchema('clear');
const clearLogEntryNode = LruCacheScenarioBuilders.eventCountNode('clear');
const onClearExpectedSchema = LruCacheScenarioBuilders.logEntryLengthSchema(clearLogEntrySchema);
const onClearExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': clearLogEntryNode, 'logLength': numberNode }, ['logEntry', 'logLength'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onClearSchema = LruCacheScenarioBuilders.scenarioSchema('on-clear', cacheEntriesInputSchema, onClearExpectedSchema);
const onClearNode = LruCacheScenarioBuilders.scenarioNode('on-clear', cacheEntriesInputNode, onClearExpectedNode);

// on-clear-empty
const cacheOnlyInputSchema = { 'additionalProperties': false, 'properties': { 'cache': LruCacheOptionsEntity.Schema }, 'required': ['cache'], 'type': 'object' } as const;
const cacheOnlyInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node }, ['cache'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onClearEmptySchema = LruCacheScenarioBuilders.scenarioSchema('on-clear-empty', cacheOnlyInputSchema, onClearExpectedSchema);
const onClearEmptyNode = LruCacheScenarioBuilders.scenarioNode('on-clear-empty', cacheOnlyInputNode, onClearExpectedNode);

// on-expire-and-on-miss
const expireLogEntrySchema = LruCacheScenarioBuilders.eventKeySchema('expire');
const expireLogEntryNode = LruCacheScenarioBuilders.eventKeyNode('expire');
const onExpireAndOnMissExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'firstLogEntry': expireLogEntrySchema, 'logLength': numberSchema, 'secondLogEntry': missLogEntrySchema, 'value': nullableNumberSchema },
  'required': ['firstLogEntry', 'logLength', 'secondLogEntry', 'value'],
  'type': 'object'
} as const;
const onExpireAndOnMissExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'firstLogEntry': expireLogEntryNode, 'logLength': numberNode, 'secondLogEntry': missLogEntryNode, 'value': nullableNumberNode }, ['firstLogEntry', 'logLength', 'secondLogEntry', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onExpireAndOnMissSchema = LruCacheScenarioBuilders.scenarioSchema('on-expire-and-on-miss', ttlExpiresInputSchema, onExpireAndOnMissExpectedSchema);
const onExpireAndOnMissNode = LruCacheScenarioBuilders.scenarioNode('on-expire-and-on-miss', ttlExpiresInputNode, onExpireAndOnMissExpectedNode);

// on-expire-with-has
const onExpireWithHasExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'expireCount': numberSchema, 'expireEntry': expireLogEntrySchema, 'present': booleanSchema },
  'required': ['expireCount', 'expireEntry', 'present'],
  'type': 'object'
} as const;
const onExpireWithHasExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'expireCount': numberNode, 'expireEntry': expireLogEntryNode, 'present': booleanNode }, ['expireCount', 'expireEntry', 'present'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const onExpireWithHasSchema = LruCacheScenarioBuilders.scenarioSchema('on-expire-with-has', ttlExpiresInputSchema, onExpireWithHasExpectedSchema);
const onExpireWithHasNode = LruCacheScenarioBuilders.scenarioNode('on-expire-with-has', ttlExpiresInputNode, onExpireWithHasExpectedNode);

// set-vs-update
const setVsUpdateExpectedSchema = { 'additionalProperties': false, 'properties': { 'setCount': numberSchema, 'updateCount': numberSchema }, 'required': ['setCount', 'updateCount'], 'type': 'object' } as const;
const setVsUpdateExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'setCount': numberNode, 'updateCount': numberNode }, ['setCount', 'updateCount'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const setVsUpdateSchema = LruCacheScenarioBuilders.scenarioSchema('set-vs-update', onUpdateInputSchema, setVsUpdateExpectedSchema);
const setVsUpdateNode = LruCacheScenarioBuilders.scenarioNode('set-vs-update', onUpdateInputNode, setVsUpdateExpectedNode);

// evict-correct-key
const evictCorrectKeyInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'lruKey': stringSchema, 'lruValue': numberSchema, 'newKey': stringSchema, 'newValue': numberSchema },
  'required': ['cache', 'lruKey', 'lruValue', 'newKey', 'newValue'],
  'type': 'object'
} as const;
const evictCorrectKeyInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'lruKey': stringNode, 'lruValue': numberNode, 'newKey': stringNode, 'newValue': numberNode }, ['cache', 'lruKey', 'lruValue', 'newKey', 'newValue'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const evictCorrectKeyExpectedSchema = { 'additionalProperties': false, 'properties': { 'evictCount': numberSchema, 'evictKey': stringSchema }, 'required': ['evictCount', 'evictKey'], 'type': 'object' } as const;
const evictCorrectKeyExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'evictCount': numberNode, 'evictKey': stringNode }, ['evictCount', 'evictKey'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const evictCorrectKeySchema = LruCacheScenarioBuilders.scenarioSchema('evict-correct-key', evictCorrectKeyInputSchema, evictCorrectKeyExpectedSchema);
const evictCorrectKeyNode = LruCacheScenarioBuilders.scenarioNode('evict-correct-key', evictCorrectKeyInputNode, evictCorrectKeyExpectedNode);

// no-stale-ms-uses-hit
const noStaleMsUsesHitSchema = LruCacheScenarioBuilders.scenarioSchema('no-stale-ms-uses-hit', cacheKeyValueInputSchema, hitLogEntryExpectedSchema);
const noStaleMsUsesHitNode = LruCacheScenarioBuilders.scenarioNode('no-stale-ms-uses-hit', cacheKeyValueInputNode, hitLogEntryExpectedNode);

// stale-before-expiry
const keyValueWaitInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'value': numberSchema, 'waitMs': numberSchema },
  'required': ['cache', 'key', 'value', 'waitMs'],
  'type': 'object'
} as const;
const keyValueWaitInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'value': numberNode, 'waitMs': numberNode }, ['cache', 'key', 'value', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const staleLogEntrySchema = LruCacheScenarioBuilders.eventKeyValueSchema('stale');
const staleLogEntryNode = LruCacheScenarioBuilders.eventKeyValueNode('stale');
const staleBeforeExpiryExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'logEntry': staleLogEntrySchema, 'logLength': numberSchema, 'value': numberSchema },
  'required': ['logEntry', 'logLength', 'value'],
  'type': 'object'
} as const;
const staleBeforeExpiryExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': staleLogEntryNode, 'logLength': numberNode, 'value': numberNode }, ['logEntry', 'logLength', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const staleBeforeExpirySchema = LruCacheScenarioBuilders.scenarioSchema('stale-before-expiry', keyValueWaitInputSchema, staleBeforeExpiryExpectedSchema);
const staleBeforeExpiryNode = LruCacheScenarioBuilders.scenarioNode('stale-before-expiry', keyValueWaitInputNode, staleBeforeExpiryExpectedNode);

// per-call-stale-override
const perCallStaleInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'staleMs': numberSchema, 'value': numberSchema, 'waitMs': numberSchema },
  'required': ['cache', 'key', 'staleMs', 'value', 'waitMs'],
  'type': 'object'
} as const;
const perCallStaleInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'staleMs': numberNode, 'value': numberNode, 'waitMs': numberNode }, ['cache', 'key', 'staleMs', 'value', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const perCallStaleExpectedSchema = { 'additionalProperties': false, 'properties': { 'logEntry': staleLogEntrySchema, 'value': numberSchema }, 'required': ['logEntry', 'value'], 'type': 'object' } as const;
const perCallStaleExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': staleLogEntryNode, 'value': numberNode }, ['logEntry', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const perCallStaleSchema = LruCacheScenarioBuilders.scenarioSchema('per-call-stale-override', perCallStaleInputSchema, perCallStaleExpectedSchema);
const perCallStaleNode = LruCacheScenarioBuilders.scenarioNode('per-call-stale-override', perCallStaleInputNode, perCallStaleExpectedNode);

// hard-expiry-wins
const hardExpiryWinsExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'firstLogEntry': expireLogEntrySchema, 'secondLogEntry': missLogEntrySchema, 'value': nullableNumberSchema },
  'required': ['firstLogEntry', 'secondLogEntry', 'value'],
  'type': 'object'
} as const;
const hardExpiryWinsExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'firstLogEntry': expireLogEntryNode, 'secondLogEntry': missLogEntryNode, 'value': nullableNumberNode }, ['firstLogEntry', 'secondLogEntry', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const hardExpiryWinsSchema = LruCacheScenarioBuilders.scenarioSchema('hard-expiry-wins', keyValueWaitInputSchema, hardExpiryWinsExpectedSchema);
const hardExpiryWinsNode = LruCacheScenarioBuilders.scenarioNode('hard-expiry-wins', keyValueWaitInputNode, hardExpiryWinsExpectedNode);

// delete-where-matches
const deleteWhereMatchesExpectedSchema = {
  'additionalProperties': false,
  'properties': {
    'deleteCount': numberSchema, 'hasA': booleanSchema, 'hasAKey': stringSchema, 'hasB': booleanSchema, 'hasBKey': stringSchema,
    'hasC': booleanSchema, 'hasCKey': stringSchema, 'matchPredicate': booleanSchema, 'removed': numberSchema, 'size': numberSchema
  },
  'required': ['deleteCount', 'hasA', 'hasAKey', 'hasB', 'hasBKey', 'hasC', 'hasCKey', 'matchPredicate', 'removed', 'size'],
  'type': 'object'
} as const;
const deleteWhereMatchesExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'deleteCount': numberNode, 'hasA': booleanNode, 'hasAKey': stringNode, 'hasB': booleanNode, 'hasBKey': stringNode,
  'hasC': booleanNode, 'hasCKey': stringNode, 'matchPredicate': booleanNode, 'removed': numberNode, 'size': numberNode
}, ['deleteCount', 'hasA', 'hasAKey', 'hasB', 'hasBKey', 'hasC', 'hasCKey', 'matchPredicate', 'removed', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteWhereMatchesSchema = LruCacheScenarioBuilders.scenarioSchema('delete-where-matches', cacheEntriesInputSchema, deleteWhereMatchesExpectedSchema);
const deleteWhereMatchesNode = LruCacheScenarioBuilders.scenarioNode('delete-where-matches', cacheEntriesInputNode, deleteWhereMatchesExpectedNode);

// delete-where-none
const deleteWhereNoneExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'logLength': numberSchema, 'removed': numberSchema, 'size': numberSchema },
  'required': ['logLength', 'removed', 'size'],
  'type': 'object'
} as const;
const deleteWhereNoneExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logLength': numberNode, 'removed': numberNode, 'size': numberNode }, ['logLength', 'removed', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteWhereNoneSchema = LruCacheScenarioBuilders.scenarioSchema('delete-where-none', cacheEntriesInputSchema, deleteWhereNoneExpectedSchema);
const deleteWhereNoneNode = LruCacheScenarioBuilders.scenarioNode('delete-where-none', cacheEntriesInputNode, deleteWhereNoneExpectedNode);

// delete-where-empty
const deleteWhereEmptyExpectedSchema = { 'additionalProperties': false, 'properties': { 'matchPredicate': booleanSchema, 'removed': numberSchema }, 'required': ['matchPredicate', 'removed'], 'type': 'object' } as const;
const deleteWhereEmptyExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'matchPredicate': booleanNode, 'removed': numberNode }, ['matchPredicate', 'removed'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deleteWhereEmptySchema = LruCacheScenarioBuilders.scenarioSchema('delete-where-empty', cacheOnlyInputSchema, deleteWhereEmptyExpectedSchema);
const deleteWhereEmptyNode = LruCacheScenarioBuilders.scenarioNode('delete-where-empty', cacheOnlyInputNode, deleteWhereEmptyExpectedNode);

// throwing-on-hit
const throwingOnHitInputSchema = {
  'additionalProperties': false,
  'properties': {
    'cache': LruCacheOptionsEntity.Schema, 'keyA': stringSchema, 'keyB': stringSchema, 'keyC': stringSchema,
    'throwMessage': stringSchema, 'valueA': numberSchema, 'valueB': numberSchema, 'valueC': numberSchema
  },
  'required': ['cache', 'keyA', 'keyB', 'keyC', 'throwMessage', 'valueA', 'valueB', 'valueC'],
  'type': 'object'
} as const;
const throwingOnHitInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'cache': LruCacheOptionsEntity.Node, 'keyA': stringNode, 'keyB': stringNode, 'keyC': stringNode,
  'throwMessage': stringNode, 'valueA': numberNode, 'valueB': numberNode, 'valueC': numberNode
}, ['cache', 'keyA', 'keyB', 'keyC', 'throwMessage', 'valueA', 'valueB', 'valueC'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const throwingOnHitExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'afterGetA': numberSchema, 'hitCount': numberSchema, 'missingKey': stringSchema },
  'required': ['afterGetA', 'hitCount', 'missingKey'],
  'type': 'object'
} as const;
const throwingOnHitExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'afterGetA': numberNode, 'hitCount': numberNode, 'missingKey': stringNode }, ['afterGetA', 'hitCount', 'missingKey'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const throwingOnHitSchema = LruCacheScenarioBuilders.scenarioSchema('throwing-on-hit', throwingOnHitInputSchema, throwingOnHitExpectedSchema);
const throwingOnHitNode = LruCacheScenarioBuilders.scenarioNode('throwing-on-hit', throwingOnHitInputNode, throwingOnHitExpectedNode);

// throwing-on-expire
const throwingOnExpireInputSchema = {
  'additionalProperties': false,
  'properties': {
    'cache': LruCacheOptionsEntity.Schema, 'key': stringSchema, 'throwMessage': stringSchema,
    'ttlMs': numberSchema, 'value': numberSchema, 'waitMs': numberSchema
  },
  'required': ['cache', 'key', 'throwMessage', 'ttlMs', 'value', 'waitMs'],
  'type': 'object'
} as const;
const throwingOnExpireInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'cache': LruCacheOptionsEntity.Node, 'key': stringNode, 'throwMessage': stringNode,
  'ttlMs': numberNode, 'value': numberNode, 'waitMs': numberNode
}, ['cache', 'key', 'throwMessage', 'ttlMs', 'value', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const throwingOnExpireExpectedSchema = { 'additionalProperties': false, 'properties': { 'size': numberSchema, 'value': nullableNumberSchema }, 'required': ['size', 'value'], 'type': 'object' } as const;
const throwingOnExpireExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'size': numberNode, 'value': nullableNumberNode }, ['size', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const throwingOnExpireSchema = LruCacheScenarioBuilders.scenarioSchema('throwing-on-expire', throwingOnExpireInputSchema, throwingOnExpireExpectedSchema);
const throwingOnExpireNode = LruCacheScenarioBuilders.scenarioNode('throwing-on-expire', throwingOnExpireInputNode, throwingOnExpireExpectedNode);

// throwing-on-update
const throwingOnUpdateInputSchema = {
  'additionalProperties': false,
  'properties': { 'cache': LruCacheOptionsEntity.Schema, 'firstValue': numberSchema, 'key': stringSchema, 'secondValue': numberSchema, 'throwMessage': stringSchema },
  'required': ['cache', 'firstValue', 'key', 'secondValue', 'throwMessage'],
  'type': 'object'
} as const;
const throwingOnUpdateInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': LruCacheOptionsEntity.Node, 'firstValue': numberNode, 'key': stringNode, 'secondValue': numberNode, 'throwMessage': stringNode }, ['cache', 'firstValue', 'key', 'secondValue', 'throwMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const throwingOnUpdateSchema = LruCacheScenarioBuilders.scenarioSchema('throwing-on-update', throwingOnUpdateInputSchema, numberValueExpectedSchema);
const throwingOnUpdateNode = LruCacheScenarioBuilders.scenarioNode('throwing-on-update', throwingOnUpdateInputNode, numberValueExpectedNode);

// invalid-options
const invalidOptionsInputSchema = { 'additionalProperties': false, 'properties': { 'cache': invalidCacheOptionsSchema }, 'required': ['cache'], 'type': 'object' } as const;
const invalidOptionsInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': invalidCacheOptionsNode }, ['cache'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const invalidOptionsExpectedSchema = { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' } as const;
const invalidOptionsExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
const invalidOptionsSchema = LruCacheScenarioBuilders.scenarioSchema('invalid-options', invalidOptionsInputSchema, invalidOptionsExpectedSchema);
const invalidOptionsNode = LruCacheScenarioBuilders.scenarioNode('invalid-options', invalidOptionsInputNode, invalidOptionsExpectedNode);

/** Every distinct `shape` value `LruCache.loop.spec.ts` exercises, discriminated by the `shape` const field. */
export namespace LruCacheScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      clearEmptiesSchema, deleteExistingSchema, deleteMissingSchema, deleteWhereEmptySchema, deleteWhereMatchesSchema, deleteWhereNoneSchema,
      entryTtlSchema, evictCorrectKeySchema, getMissingSchema, hardExpiryWinsSchema, hasExistingSchema, hasMissingSchema, invalidOptionsSchema,
      lruEvictsTailSchema, lruPromotesSchema, noStaleMsUsesHitSchema, objectKeyIdentitySchema, onClearSchema, onClearEmptySchema, onDeleteSchema,
      onDeleteAbsentSchema, onEvictSchema, onExpireAndOnMissSchema, onExpireWithHasSchema, onHitSchema, onMissSchema, onSetSchema, onUpdateSchema,
      perCallStaleSchema, setGetSchema, setVsUpdateSchema, sizeReflectsSchema, staleBeforeExpirySchema, throwingOnExpireSchema, throwingOnHitSchema,
      throwingOnUpdateSchema, ttlBeforeSchema, ttlExpiresSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    clearEmptiesNode, deleteExistingNode, deleteMissingNode, deleteWhereEmptyNode, deleteWhereMatchesNode, deleteWhereNoneNode,
    entryTtlNode, evictCorrectKeyNode, getMissingNode, hardExpiryWinsNode, hasExistingNode, hasMissingNode, invalidOptionsNode,
    lruEvictsTailNode, lruPromotesNode, noStaleMsUsesHitNode, objectKeyIdentityNode, onClearNode, onClearEmptyNode, onDeleteNode,
    onDeleteAbsentNode, onEvictNode, onExpireAndOnMissNode, onExpireWithHasNode, onHitNode, onMissNode, onSetNode, onUpdateNode,
    perCallStaleNode, setGetNode, setVsUpdateNode, sizeReflectsNode, staleBeforeExpiryNode, throwingOnExpireNode, throwingOnHitNode,
    throwingOnUpdateNode, ttlBeforeNode, ttlExpiresNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
