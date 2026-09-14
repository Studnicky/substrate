import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { CAUSE_CHAIN_DEPTH_LIMIT } from '../constants/CauseChainConstants.js';
import {
  PROBLEM_TITLE_THROWN_NULLISH,
  PROBLEM_TYPE_THROWN_NULLISH
} from '../constants/ProblemConstants.js';
import { ThrownValueProjection } from '../validation/thrownValueProjection.js';
import { CauseNodeEntity } from './CauseNodeEntity.js';

/**
 * Total, never-throwing projection of an arbitrary caught value into RFC 9457 members.
 *
 * A caught value can be anything: an `Error`, a subclass, an `AggregateError`, a
 * `DOMException`, a string, `null`, an engine-thrown object from `JSON.parse` or `fetch`.
 * This entity describes the open set reality actually produces, and it must never itself
 * throw — a value that cannot be classified precisely still resolves to a problem type
 * rather than being rejected.
 *
 * The projection is structurally a Problem Details object, but its three core members are
 * REQUIRED here rather than optional: this side always produces them, and requiring them is
 * what lets callers read `.detail` as a `string` instead of narrowing at every use. The
 * problem type URI carries the classification, so there is no separate discriminant member.
 */
export namespace ThrownValueEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ThrownValue',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'causes': {
        'description': 'Bounded, cycle-safe projection of the remainder of the cause chain (excludes this node).',
        'items': CauseNodeEntity.Schema,
        'maxItems': CAUSE_CHAIN_DEPTH_LIMIT,
        'type': 'array'
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
      'stack': {
        'description': 'Stack trace of the head node. Cause nodes carry none.',
        'type': 'string'
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
    'title': 'ThrownValue',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = ThrownValueProjection.project;
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
