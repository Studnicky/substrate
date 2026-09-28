import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { PaginatorExhaustedCursorEntity } from '../../../src/entities/PaginatorExhaustedCursorEntity.js';
import { PaginatorIdleStateEntity } from '../../../src/entities/PaginatorIdleStateEntity.js';
import { PaginatorResetEventEntity } from '../../../src/entities/PaginatorResetEventEntity.js';

const numberAvailableCursorSchema = {
  'additionalProperties': false,
  'properties': { 'cursor': { 'type': 'number' }, 'exhausted': { 'const': false } },
  'required': ['cursor', 'exhausted'],
  'type': 'object'
} as const;

const numberAvailableCursorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cursor': SchemaNode.defineNumber({ 'type': 'number' } as const), 'exhausted': SchemaNode.defineConst({}, false as const) }, ['cursor', 'exhausted'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** `Node.schema`'s flattened form drops the redundant `type` sibling `defineConst` never emits — matched here, not on the production entity's own `Schema`. */
const exhaustedCursorSchema = {
  'additionalProperties': false,
  'properties': { 'exhausted': { 'const': true } },
  'required': ['exhausted'],
  'type': 'object'
} as const;

/** Cursor branches are mutually exclusive by `exhausted`, so `oneOf` (flattened by `NodeSchemaAgreement`) rather than `anyOf` (not). */
const cursorUnionSchema = { 'oneOf': [numberAvailableCursorSchema, exhaustedCursorSchema] } as const;
const cursorUnionNode = SchemaNode.defineOneOf({}, [numberAvailableCursorNode, PaginatorExhaustedCursorEntity.Node] as const);

const stringNumberPageReceivedEventSchema = {
  'additionalProperties': false,
  'properties': {
    'nextCursor': cursorUnionSchema,
    'page': { 'type': 'string' },
    'type': { 'const': 'pageReceived' }
  },
  'required': ['nextCursor', 'page', 'type'],
  'type': 'object'
} as const;

const stringNumberPageReceivedEventNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'nextCursor': cursorUnionNode,
    'page': SchemaNode.defineString({ 'type': 'string' } as const),
    'type': SchemaNode.defineConst({}, 'pageReceived' as const)
  }, ['nextCursor', 'page', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** `Node.schema`'s flattened form drops the redundant `type` sibling `defineConst` never emits — matched here, not on the production entity's own `Schema`. */
const resetEventSchema = {
  'additionalProperties': false,
  'properties': { 'type': { 'const': 'reset' } },
  'required': ['type'],
  'type': 'object'
} as const;

const eventUnionSchema = { 'oneOf': [resetEventSchema, stringNumberPageReceivedEventSchema] } as const;
const eventUnionNode = SchemaNode.defineOneOf({}, [PaginatorResetEventEntity.Node, stringNumberPageReceivedEventNode] as const);

const stringNumberHasMoreStateSchema = {
  'additionalProperties': false,
  'properties': {
    'cursor': { 'type': 'number' },
    'pages': { 'items': { 'type': 'string' }, 'type': 'array' },
    'variant': { 'const': 'hasMore' }
  },
  'required': ['cursor', 'pages', 'variant'],
  'type': 'object'
} as const;

const stringNumberHasMoreStateNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'cursor': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'pages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
    'variant': SchemaNode.defineConst({}, 'hasMore' as const)
  }, ['cursor', 'pages', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const stringExhaustedStateSchema = {
  'additionalProperties': false,
  'properties': { 'pages': { 'items': { 'type': 'string' }, 'type': 'array' }, 'variant': { 'const': 'exhausted' } },
  'required': ['pages', 'variant'],
  'type': 'object'
} as const;

const stringExhaustedStateNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'pages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
    'variant': SchemaNode.defineConst({}, 'exhausted' as const)
  }, ['pages', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** `Node.schema`'s flattened form drops the redundant `type` sibling `defineConst` never emits — matched here, not on the production entity's own `Schema`. */
const idleStateSchema = {
  'additionalProperties': false,
  'properties': { 'variant': { 'const': 'idle' } },
  'required': ['variant'],
  'type': 'object'
} as const;

const stateUnionSchema = { 'oneOf': [idleStateSchema, stringNumberHasMoreStateSchema, stringExhaustedStateSchema] } as const;
const stateUnionNode = SchemaNode.defineOneOf({}, [PaginatorIdleStateEntity.Node, stringNumberHasMoreStateNode, stringExhaustedStateNode] as const);

const cursorDiscriminantsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'descriptions': { 'items': { 'type': 'string' }, 'type': 'array' } },
      'required': ['descriptions'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'cursors': { 'items': cursorUnionSchema, 'type': 'array' } },
      'required': ['cursors'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'cursor-discriminants' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const cursorDiscriminantsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'descriptions': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['descriptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'cursors': SchemaNode.defineArray({ 'type': 'array' } as const, cursorUnionNode, undefined) }, ['cursors'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'cursor-discriminants' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const eventDiscriminantsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'descriptions': { 'items': { 'type': 'string' }, 'type': 'array' } },
      'required': ['descriptions'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'events': { 'items': eventUnionSchema, 'type': 'array' } },
      'required': ['events'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'event-discriminants' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const eventDiscriminantsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'descriptions': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['descriptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventUnionNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'event-discriminants' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const stateDiscriminantsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'descriptions': { 'items': { 'type': 'string' }, 'type': 'array' } },
      'required': ['descriptions'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'states': { 'items': stateUnionSchema, 'type': 'array' } },
      'required': ['states'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'state-discriminants' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const stateDiscriminantsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'descriptions': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['descriptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'states': SchemaNode.defineArray({ 'type': 'array' } as const, stateUnionNode, undefined) }, ['states'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'state-discriminants' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The three scenario case shapes `discriminantNarrowing.loop.spec.ts` exercises. Mutually exclusive by `shape`. */
export namespace DiscriminantNarrowingScenarioCaseEntity {
  export const Schema = {
    'oneOf': [cursorDiscriminantsSchema, eventDiscriminantsSchema, stateDiscriminantsSchema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [cursorDiscriminantsNode, eventDiscriminantsNode, stateDiscriminantsNode] as const);
  export type Type = NodeStaticType<typeof Node>;
}
