import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds the `{ description, expected, input, name, shape }` envelope one branch of the case union shares, varying only `shape` and the two payloads. */
class DeadLetterQueueRetryGeneratorScenarioCaseBuilders {
  static scenarioSchema<const TShape extends string, TInputSchema extends object, TExpectedSchema extends object>(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
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

  static scenarioNode<const TShape extends string, TInputNode extends SchemaNodeInterface<unknown, unknown>, TExpectedNode extends SchemaNodeInterface<unknown, unknown>>(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
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

const deadLetterQueueRetryAsyncHookIsolationInputSchema = { 'additionalProperties': false, 'properties': { 'resilience': { 'additionalProperties': false, 'properties': { 'first': { 'type': 'string' }, 'intervalMs': { 'type': 'number' }, 'second': { 'type': 'string' } }, 'required': ['first', 'intervalMs', 'second'], 'type': 'object' } }, 'required': ['resilience'], 'type': 'object' } as const;
const deadLetterQueueRetryAsyncHookIsolationInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'resilience': SchemaNode.defineObject({ 'type': 'object' } as const, { 'first': SchemaNode.defineString({ 'type': 'string' } as const), 'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'second': SchemaNode.defineString({ 'type': 'string' } as const) }, ['first', 'intervalMs', 'second'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['resilience'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deadLetterQueueRetryAsyncHookIsolationExpectedSchema = { 'additionalProperties': false, 'properties': { 'hookName': { 'type': 'string' }, 'rejectionEvents': { 'type': 'number' }, 'yielded': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['hookName', 'rejectionEvents', 'yielded'], 'type': 'object' } as const;
const deadLetterQueueRetryAsyncHookIsolationExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookName': SchemaNode.defineString({ 'type': 'string' } as const), 'rejectionEvents': SchemaNode.defineNumber({ 'type': 'number' } as const), 'yielded': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['hookName', 'rejectionEvents', 'yielded'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const deadLetterQueueRetryHookSwallowsInputSchema = { 'additionalProperties': false, 'properties': { 'resilience': { 'additionalProperties': false, 'properties': { 'intervalMs': { 'type': 'number' }, 'items': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['intervalMs', 'items'], 'type': 'object' } }, 'required': ['resilience'], 'type': 'object' } as const;
const deadLetterQueueRetryHookSwallowsInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'resilience': SchemaNode.defineObject({ 'type': 'object' } as const, { 'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['intervalMs', 'items'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['resilience'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deadLetterQueueRetryHookSwallowsExpectedSchema = { 'additionalProperties': false, 'properties': { 'waitYieldDone': { 'type': 'boolean' }, 'yielded': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['waitYieldDone', 'yielded'], 'type': 'object' } as const;
const deadLetterQueueRetryHookSwallowsExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'waitYieldDone': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'yielded': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['waitYieldDone', 'yielded'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const deadLetterQueueRetryInvalidIntervalInputSchema = { 'additionalProperties': false, 'properties': { 'resilience': { 'additionalProperties': false, 'properties': { 'intervalMs': { 'items': { 'type': 'number' }, 'type': 'array' }, 'queueEmpty': { 'type': 'boolean' } }, 'required': ['intervalMs', 'queueEmpty'], 'type': 'object' } }, 'required': ['resilience'], 'type': 'object' } as const;
const deadLetterQueueRetryInvalidIntervalInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'resilience': SchemaNode.defineObject({ 'type': 'object' } as const, { 'intervalMs': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), 'queueEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['intervalMs', 'queueEmpty'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['resilience'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deadLetterQueueRetryInvalidIntervalExpectedSchema = { 'additionalProperties': false, 'properties': { 'throws': { 'type': 'string' } }, 'required': ['throws'], 'type': 'object' } as const;
const deadLetterQueueRetryInvalidIntervalExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'throws': SchemaNode.defineString({ 'type': 'string' } as const) }, ['throws'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const deadLetterQueueRetryLifecycleInputSchema = { 'additionalProperties': false, 'properties': { 'resilience': { 'additionalProperties': false, 'properties': { 'intervalMs': { 'type': 'number' }, 'items': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['intervalMs', 'items'], 'type': 'object' } }, 'required': ['resilience'], 'type': 'object' } as const;
const deadLetterQueueRetryLifecycleInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'resilience': SchemaNode.defineObject({ 'type': 'object' } as const, { 'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['intervalMs', 'items'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['resilience'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deadLetterQueueRetryLifecycleExpectedSchema = { 'additionalProperties': false, 'properties': { 'events': { 'items': { 'type': 'string' }, 'type': 'array' }, 'yielded': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['events', 'yielded'], 'type': 'object' } as const;
const deadLetterQueueRetryLifecycleExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'yielded': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['events', 'yielded'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const deadLetterQueueRetryMissingDeadLetterQueueInputSchema = { 'additionalProperties': false, 'properties': { 'resilience': { 'additionalProperties': false, 'properties': { 'intervalMs': { 'type': 'number' } }, 'required': ['intervalMs'], 'type': 'object' } }, 'required': ['resilience'], 'type': 'object' } as const;
const deadLetterQueueRetryMissingDeadLetterQueueInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'resilience': SchemaNode.defineObject({ 'type': 'object' } as const, { 'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['intervalMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['resilience'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const deadLetterQueueRetryMissingDeadLetterQueueExpectedSchema = { 'additionalProperties': false, 'properties': { 'throws': { 'type': 'string' } }, 'required': ['throws'], 'type': 'object' } as const;
const deadLetterQueueRetryMissingDeadLetterQueueExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'throws': SchemaNode.defineString({ 'type': 'string' } as const) }, ['throws'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The scenario case shapes `dead-letter-queue-retry-generator.loop.spec.ts` exercises. */
export namespace DeadLetterQueueRetryGeneratorScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioSchema('dlqr-async-hook-isolation', deadLetterQueueRetryAsyncHookIsolationInputSchema, deadLetterQueueRetryAsyncHookIsolationExpectedSchema),
      DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioSchema('dlqr-hook-swallows', deadLetterQueueRetryHookSwallowsInputSchema, deadLetterQueueRetryHookSwallowsExpectedSchema),
      DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioSchema('dlqr-invalid-interval', deadLetterQueueRetryInvalidIntervalInputSchema, deadLetterQueueRetryInvalidIntervalExpectedSchema),
      DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioSchema('dlqr-lifecycle', deadLetterQueueRetryLifecycleInputSchema, deadLetterQueueRetryLifecycleExpectedSchema),
      DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioSchema('dlqr-missing-dlq', deadLetterQueueRetryMissingDeadLetterQueueInputSchema, deadLetterQueueRetryMissingDeadLetterQueueExpectedSchema)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioNode('dlqr-async-hook-isolation', deadLetterQueueRetryAsyncHookIsolationInputNode, deadLetterQueueRetryAsyncHookIsolationExpectedNode),
    DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioNode('dlqr-hook-swallows', deadLetterQueueRetryHookSwallowsInputNode, deadLetterQueueRetryHookSwallowsExpectedNode),
    DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioNode('dlqr-invalid-interval', deadLetterQueueRetryInvalidIntervalInputNode, deadLetterQueueRetryInvalidIntervalExpectedNode),
    DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioNode('dlqr-lifecycle', deadLetterQueueRetryLifecycleInputNode, deadLetterQueueRetryLifecycleExpectedNode),
    DeadLetterQueueRetryGeneratorScenarioCaseBuilders.scenarioNode('dlqr-missing-dlq', deadLetterQueueRetryMissingDeadLetterQueueInputNode, deadLetterQueueRetryMissingDeadLetterQueueExpectedNode)
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
