import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import {
  CAUSE_CHAIN_DEPTH_LIMIT,
  PROBLEM_TITLE_THROWN_NULLISH,
  PROBLEM_TYPE_THROWN_NULLISH,
  ThrownValueProjection
} from '@studnicky/types/browser';

import { RuntimeError } from '../errors/RuntimeError.js';
import { CauseNodeEntity } from './CauseNodeEntity.js';

/**
 * Projects `input` through the dependency-free `ThrownValueProjection`, then validates the
 * result against this entity's schema so the returned value carries the entity's brands.
 * The projection is total; a projection the schema rejects is an invariant break.
 */
class ThrownValueIntake {
  public static intake(input: unknown): ThrownValueEntity.Type {
    const projection = ThrownValueProjection.project(input);

    if (ThrownValueEntity.validate(projection)) {
      return projection;
    }
    throw RuntimeError.create(`thrown value projection violates ThrownValueEntity's own schema: ${EntityCompiler.formatErrors(ThrownValueEntity.validate.errors)}`);
  }
}

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
 *
 * `intake` runs `ThrownValueProjection` from `@studnicky/types` and validates the result
 * against this entity's schema.
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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ThrownValue', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ThrownValue', 'type': 'object' } as const, { 'causes': SchemaNode.defineArray({ 'description': 'Bounded, cycle-safe projection of the remainder of the cause chain (excludes this node).', 'maxItems': CAUSE_CHAIN_DEPTH_LIMIT, 'type': 'array' } as const, CauseNodeEntity.Node, undefined), 'detail': SchemaNode.defineString({
    'default': '',
    'description': "Human-readable explanation specific to this occurrence — the caught value's message.",
    'type': 'string'
  } as const), 'name': SchemaNode.defineString({
    'description': "Constructor name of the caught value, when it had one (e.g. 'TypeError').",
    'type': 'string'
  } as const), 'stack': SchemaNode.defineString({
    'description': 'Stack trace of the head node. Cause nodes carry none.',
    'type': 'string'
  } as const), 'title': SchemaNode.defineString({
    'default': PROBLEM_TITLE_THROWN_NULLISH,
    'description': 'Stable human-readable name of the problem type.',
    'type': 'string'
  } as const), 'type': SchemaNode.defineString({
    'default': PROBLEM_TYPE_THROWN_NULLISH,
    'description': 'URI reference identifying the problem type. The discriminant.',
    'type': 'string'
  } as const) }, ['detail', 'title', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = ThrownValueIntake.intake;
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
