import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import {
  PROBLEM_TITLE_THROWN_NULLISH, PROBLEM_TYPE_THROWN_NULLISH
} from '../constants/ProblemConstants.js';

/**
 * One node of a cause chain, shaped as RFC 9457 members.
 *
 * This is the item shape of the `causes` EXTENSION member, not a standalone Problem Details
 * object, so it is sealed and its three members are required: the projection always produces
 * all three. `type` is the discriminant — a caught string and a caught `AggregateError` are
 * told apart by their type URI, which is why no separate classification member exists.
 *
 */
export namespace CauseNodeEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/CauseNode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'code': {
        'description': 'Registered dotted error code, when this node was a `BaseError`.',
        'type': 'string'
      },
      'context': {
        'additionalProperties': {},
        'description': 'Structured metadata carried by this node, when it was a `BaseError`.',
        'type': 'object'
      },
      'correlationId': {
        'description': 'Correlation ID carried by this node, when it was a `BaseError`.',
        'type': 'string'
      },
      'detail': {
        'default': '',
        'description': "Human-readable explanation specific to this occurrence — the caught value's message.",
        'type': 'string'
      },
      'name': {
        'description': "Constructor name of the caught value, when it had one (e.g. 'TypeError').",
        'type': 'string'
      },
      'timestamp': {
        'description': 'Construction timestamp carried by this node, when it was a `BaseError`.',
        'type': 'number'
      },
      'title': {
        'default': PROBLEM_TITLE_THROWN_NULLISH,
        'description': 'Stable human-readable name of the problem type.',
        'type': 'string'
      },
      'type': {
        'default': PROBLEM_TYPE_THROWN_NULLISH,
        'description': 'URI reference identifying the problem type. The discriminant.',
        'type': 'string'
      }
    },
    'required': ['detail', 'title', 'type'],
    'title': 'CauseNode',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/CauseNode', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'CauseNode', 'type': 'object' } as const, { 'code': SchemaNode.defineString({
    'description': 'Registered dotted error code, when this node was a `BaseError`.',
    'type': 'string'
  } as const), 'context': SchemaNode.defineObject({ 'description': 'Structured metadata carried by this node, when it was a `BaseError`.', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const) }), 'correlationId': SchemaNode.defineString({
    'description': 'Correlation ID carried by this node, when it was a `BaseError`.',
    'type': 'string'
  } as const), 'detail': SchemaNode.defineString({
    'default': '',
    'description': "Human-readable explanation specific to this occurrence — the caught value's message.",
    'type': 'string'
  } as const), 'name': SchemaNode.defineString({
    'description': "Constructor name of the caught value, when it had one (e.g. 'TypeError').",
    'type': 'string'
  } as const), 'timestamp': SchemaNode.defineNumber({
    'description': 'Construction timestamp carried by this node, when it was a `BaseError`.',
    'type': 'number'
  } as const), 'title': SchemaNode.defineString({
    'default': PROBLEM_TITLE_THROWN_NULLISH,
    'description': 'Stable human-readable name of the problem type.',
    'type': 'string'
  } as const), 'type': SchemaNode.defineString({
    'default': PROBLEM_TYPE_THROWN_NULLISH,
    'description': 'URI reference identifying the problem type. The discriminant.',
    'type': 'string'
  } as const) }, ['detail', 'title', 'type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
