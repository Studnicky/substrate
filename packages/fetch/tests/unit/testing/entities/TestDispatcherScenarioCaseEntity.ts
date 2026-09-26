import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SocketDispatcherStatsEntity } from '../../../../src/entities/SocketDispatcherStatsEntity.js';
import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `TestDispatcher.loop.spec.ts` scenario case shape. All fields but `origin`/`testDispatcher`/`url` are optional — `shape` picks which subset a runner reads. */
export namespace TestDispatcherScenarioCaseEntity {
  const shapes = [
    'delete-post', 'enetunreach', 'enotfound', 'head-post', 'invalid-protocol', 'not-found', 'ok', 'patch-post', 'post-arraybuffer', 'post-blob',
    'post-dataview', 'post-echo', 'post-posts', 'post-string', 'post-uint8array', 'put-post', 'queued-request-aborts-before-dispatch',
    'signal-aborted-before-wait', 'text-response', 'url-echo'
  ] as const;

  const testDispatcherSchema = {
    'additionalProperties': false,
    'properties': { 'connections': { 'minimum': 1, 'type': 'integer' }, 'enabled': { 'type': 'boolean' } },
    'required': ['connections', 'enabled'],
    'type': 'object'
  } as const;
  const TestDispatcherConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
    ['connections', 'enabled'] as const,
    { 'additionalProperties': false }
  );

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'body': BoundedJsonValueEntity.Schema,
          'errorCode': { 'type': 'string' },
          'errorMessage': { 'type': 'string' },
          'headers': { 'additionalProperties': { 'type': 'string' }, 'properties': {}, 'required': [], 'type': 'object' },
          'longStatus': { 'type': 'integer' },
          'origin': { 'minLength': 1, 'type': 'string' },
          'queuedErrorMessage': { 'type': 'string' },
          'queuedErrorName': { 'type': 'string' },
          'stats': SocketDispatcherStatsEntity.Schema,
          'status': { 'type': 'integer' }
        },
        'required': ['origin'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'abortAfterMs': { 'type': 'integer' },
          'body': { 'type': 'string' },
          'bodyBuffer': { 'items': { 'type': 'integer' }, 'type': 'array' },
          'init': { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' },
          'longUrl': { 'minLength': 1, 'type': 'string' },
          'queuedUrl': { 'minLength': 1, 'type': 'string' },
          'testDispatcher': testDispatcherSchema,
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['testDispatcher'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': shapes }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'body': BoundedJsonValueEntity.Node,
          'errorCode': SchemaNode.defineString({ 'type': 'string' } as const),
          'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'headers': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineString({ 'type': 'string' } as const) }),
          'longStatus': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'origin': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'queuedErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'queuedErrorName': SchemaNode.defineString({ 'type': 'string' } as const),
          'stats': SocketDispatcherStatsEntity.Node,
          'status': SchemaNode.defineNumber({ 'type': 'integer' } as const)
        },
        ['origin'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'abortAfterMs': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'body': SchemaNode.defineString({ 'type': 'string' } as const),
          'bodyBuffer': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const)),
          'init': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node }),
          'longUrl': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'queuedUrl': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'testDispatcher': TestDispatcherConfigNode,
          'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['testDispatcher'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(shapes)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
