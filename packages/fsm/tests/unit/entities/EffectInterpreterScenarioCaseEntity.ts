import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `EffectInterpreter.loop.spec.ts` scenario case shape. `expected` stays an open bag — each shape reads a different subset, coerced at the call site, never a cast. */
export namespace EffectInterpreterScenarioCaseEntity {
  const demoEventSchema = {
    'additionalProperties': false,
    'properties': { 'type': { 'enum': ['activate', 'deactivate'] } },
    'required': ['type'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'activateEvent': demoEventSchema,
          'activeCount': { 'type': 'number' },
          'deactivateEvent': demoEventSchema,
          'event': demoEventSchema,
          'events': { 'items': demoEventSchema, 'type': 'array' },
          'initialCount': { 'type': 'number' },
          'machineId': { 'type': 'string' },
          'mailboxCapacity': { 'type': 'number' },
          'mutatedCount': { 'type': 'number' },
          'postMutationCount': { 'type': 'number' },
          'postTransitionMutationCount': { 'type': 'number' },
          'recoveryEvent': demoEventSchema,
          'rejectedEvent': demoEventSchema
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'create-empty-machine-id', 'create-default-identity', 'create-non-integer-mailbox-capacity', 'create-non-positive-mailbox-capacity',
          'effect-handler-called-after-transition', 'effect-handler-omitted', 'get-state-before-start', 'handler-dispatches-within-send',
          'mailbox-capacity-bounds-mailbox', 'processes-events-fifo', 'queued-send-resolves-after-own-transition', 'rejected-transition-does-not-wedge',
          'send-before-start', 'send-transitions-state', 'snapshot-isolation', 'start-sets-initial-state', 'start-is-idempotent', 'stop-after-start',
          'stop-while-handler-in-flight', 'stop-before-start', 'stop-hook-throws', 'throwing-observer-does-not-block-send',
          'unsubscribe-stops-notifications'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const DemoEventNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'type': SchemaNode.defineEnum(['activate', 'deactivate'] as const) },
    ['type'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true }),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'activateEvent': DemoEventNode,
          'activeCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'deactivateEvent': DemoEventNode,
          'event': DemoEventNode,
          'events': SchemaNode.defineArray({ 'type': 'array' } as const, DemoEventNode),
          'initialCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'machineId': SchemaNode.defineString({ 'type': 'string' } as const),
          'mailboxCapacity': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'mutatedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'postMutationCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'postTransitionMutationCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'recoveryEvent': DemoEventNode,
          'rejectedEvent': DemoEventNode
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'create-empty-machine-id', 'create-default-identity', 'create-non-integer-mailbox-capacity', 'create-non-positive-mailbox-capacity',
        'effect-handler-called-after-transition', 'effect-handler-omitted', 'get-state-before-start', 'handler-dispatches-within-send',
        'mailbox-capacity-bounds-mailbox', 'processes-events-fifo', 'queued-send-resolves-after-own-transition', 'rejected-transition-does-not-wedge',
        'send-before-start', 'send-transitions-state', 'snapshot-isolation', 'start-sets-initial-state', 'start-is-idempotent', 'stop-after-start',
        'stop-while-handler-in-flight', 'stop-before-start', 'stop-hook-throws', 'throwing-observer-does-not-block-send',
        'unsubscribe-stops-notifications'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
