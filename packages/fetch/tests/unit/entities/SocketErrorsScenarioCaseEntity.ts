import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SocketDispatcherStatsEntity } from '../../../src/entities/SocketDispatcherStatsEntity.js';

/**
 * The `socket-errors.loop.spec.ts` scenario case shape: one `oneOf` branch per `shape`,
 * so `shape` and `expected`/`input` narrow together instead of independently.
 */
export namespace SocketErrorsScenarioCaseEntity {
  const statsSchema = SocketDispatcherStatsEntity.Schema;

  const inputWithStatsSchema = {
    'additionalProperties': false,
    'properties': { 'stats': statsSchema, 'url': { 'minLength': 1, 'type': 'string' } },
    'required': ['stats', 'url'],
    'type': 'object'
  } as const;

  const InputWithStatsNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'stats': SocketDispatcherStatsEntity.Node, 'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
    ['stats', 'url'] as const,
    { 'additionalProperties': false }
  );

  const inputUrlOnlySchema = { 'additionalProperties': false, 'properties': { 'url': { 'minLength': 1, 'type': 'string' } }, 'required': ['url'], 'type': 'object' } as const;
  const InputUrlOnlyNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['url'] as const, { 'additionalProperties': false });

  const urlOnlySchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'dispatcherStats': { 'const': '__UNDEFINED__' },
          'maximumConnections': { 'type': 'integer' },
          'pendingRequests': { 'type': 'integer' },
          'queuedRequests': { 'type': 'integer' },
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['dispatcherStats', 'maximumConnections', 'pendingRequests', 'queuedRequests', 'url'],
        'type': 'object'
      },
      'input': inputUrlOnlySchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'url-only' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const withStatsSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'dispatcherStats': statsSchema,
          'maximumConnections': { 'type': 'integer' },
          'pendingRequests': { 'type': 'integer' },
          'queuedRequests': { 'type': 'integer' },
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['dispatcherStats', 'maximumConnections', 'pendingRequests', 'queuedRequests', 'url'],
        'type': 'object'
      },
      'input': inputWithStatsSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'with-stats' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const messageIncludesStatsSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'messageIncludes': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' } },
        'required': ['messageIncludes'],
        'type': 'object'
      },
      'input': inputWithStatsSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'message-includes-stats' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const catchableSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'caughtName': { 'const': 'SocketExhaustionError' }, 'url': { 'minLength': 1, 'type': 'string' } },
        'required': ['caughtName', 'url'],
        'type': 'object'
      },
      'input': inputWithStatsSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'catchable' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const propertyTypesSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'dispatcherStatsType': { 'const': 'object' },
          'freeConnectionsType': { 'const': 'number' },
          'maximumConnectionsType': { 'const': 'number' },
          'pendingRequestsType': { 'const': 'number' },
          'queuedRequestsType': { 'const': 'number' },
          'urlType': { 'const': 'string' }
        },
        'required': ['dispatcherStatsType', 'freeConnectionsType', 'maximumConnectionsType', 'pendingRequestsType', 'queuedRequestsType', 'urlType'],
        'type': 'object'
      },
      'input': inputWithStatsSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'property-types' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const preserveThroughThrowSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'dispatcherStatsDefined': { 'const': true },
          'freeConnections': { 'type': 'integer' },
          'maximumConnections': { 'type': 'integer' },
          'pendingRequests': { 'type': 'integer' },
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['dispatcherStatsDefined', 'freeConnections', 'maximumConnections', 'pendingRequests', 'url'],
        'type': 'object'
      },
      'input': inputWithStatsSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'preserve-through-throw' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Schema = {
    'oneOf': [urlOnlySchema, withStatsSchema, messageIncludesStatsSchema, catchableSchema, propertyTypesSchema, preserveThroughThrowSchema]
  } as const;

  const UrlOnlyNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'dispatcherStats': SchemaNode.defineConst('__UNDEFINED__' as const),
          'maximumConnections': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'pendingRequests': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'queuedRequests': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['dispatcherStats', 'maximumConnections', 'pendingRequests', 'queuedRequests', 'url'] as const,
        { 'additionalProperties': false }
      ),
      'input': InputUrlOnlyNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('url-only' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  const WithStatsNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'dispatcherStats': SocketDispatcherStatsEntity.Node,
          'maximumConnections': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'pendingRequests': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'queuedRequests': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['dispatcherStats', 'maximumConnections', 'pendingRequests', 'queuedRequests', 'url'] as const,
        { 'additionalProperties': false }
      ),
      'input': InputWithStatsNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('with-stats' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  const MessageIncludesStatsNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)) },
        ['messageIncludes'] as const,
        { 'additionalProperties': false }
      ),
      'input': InputWithStatsNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('message-includes-stats' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  const CatchableNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'caughtName': SchemaNode.defineConst('SocketExhaustionError' as const), 'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
        ['caughtName', 'url'] as const,
        { 'additionalProperties': false }
      ),
      'input': InputWithStatsNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('catchable' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  const PropertyTypesNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'dispatcherStatsType': SchemaNode.defineConst('object' as const),
          'freeConnectionsType': SchemaNode.defineConst('number' as const),
          'maximumConnectionsType': SchemaNode.defineConst('number' as const),
          'pendingRequestsType': SchemaNode.defineConst('number' as const),
          'queuedRequestsType': SchemaNode.defineConst('number' as const),
          'urlType': SchemaNode.defineConst('string' as const)
        },
        ['dispatcherStatsType', 'freeConnectionsType', 'maximumConnectionsType', 'pendingRequestsType', 'queuedRequestsType', 'urlType'] as const,
        { 'additionalProperties': false }
      ),
      'input': InputWithStatsNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('property-types' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  const PreserveThroughThrowNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'dispatcherStatsDefined': SchemaNode.defineConst(true as const),
          'freeConnections': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'maximumConnections': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'pendingRequests': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['dispatcherStatsDefined', 'freeConnections', 'maximumConnections', 'pendingRequests', 'url'] as const,
        { 'additionalProperties': false }
      ),
      'input': InputWithStatsNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('preserve-through-throw' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineOneOf([
    UrlOnlyNode, WithStatsNode, MessageIncludesStatsNode, CatchableNode, PropertyTypesNode, PreserveThroughThrowNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
