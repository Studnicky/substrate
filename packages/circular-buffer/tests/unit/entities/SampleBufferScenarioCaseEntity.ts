import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface,
  SchemaNodeInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The twelve scenario case shapes `sample-buffer.loop.spec.ts` exercises against `SampleBuffer`. */
export namespace SampleBufferScenarioCaseEntity {
  const capacitySchema = {
    'additionalProperties': false,
    'properties': { 'capacity': { 'type': 'number' } },
    'required': ['capacity'],
    'type': 'object'
  } as const;
  const capacityNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['capacity'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const capacityWithExtraSchema = {
    'additionalProperties': false,
    'properties': { 'capacity': { 'type': 'number' }, 'extra': { 'type': 'boolean' } },
    'required': ['capacity'],
    'type': 'object'
  } as const;
  const capacityWithExtraNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'extra': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    ['capacity'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const numberArraySchema = { 'items': { 'type': 'number' }, 'type': 'array' } as const;
  const numberArrayNode = SchemaNode.defineArray(
    { 'type': 'array' } as const,
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    undefined
  );

  const stringArraySchema = { 'items': { 'type': 'string' }, 'type': 'array' } as const;
  const stringArrayNode = SchemaNode.defineArray(
    { 'type': 'array' } as const,
    SchemaNode.defineString({ 'type': 'string' } as const),
    undefined
  );

  const nullableNumberSchema = { 'oneOf': [{ 'type': 'number' }, { 'type': 'null' }] } as const;
  const nullableNumberNode = SchemaNode.defineOneOf({}, [
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineNull({ 'type': 'null' } as const)
  ] as const);

  class SampleBufferScenarioCaseEntityBuilders {
    static branchSchema<
      const TShape extends string,
      const TInputProps extends Record<string, unknown>,
      const TInputRequired extends readonly string[],
      const TExpectedProps extends Record<string, unknown>,
      const TExpectedRequired extends readonly string[]
    >(
      shape: TShape,
      inputProperties: TInputProps,
      inputRequired: TInputRequired,
      expectedProperties: TExpectedProps,
      expectedRequired: TExpectedRequired
    ) {
      const result = {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': expectedProperties,
            'required': expectedRequired,
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': inputProperties,
            'required': inputRequired,
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': shape }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }

    static branchNode<
      const TShape extends string,
      TInputProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
      TExpectedProps extends Record<string, SchemaNodeInterface<unknown, unknown>>
    >(
      shape: TShape,
      inputProperties: TInputProps,
      inputRequired: readonly (keyof TInputProps & string)[],
      expectedProperties: TExpectedProps,
      expectedRequired: readonly (keyof TExpectedProps & string)[]
    ) {
      const result = SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'expected': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            expectedProperties,
            expectedRequired,
            { 'additionalProperties': false, 'patternProperties': {} }
          ),
          'input': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            inputProperties,
            inputRequired,
            { 'additionalProperties': false, 'patternProperties': {} }
          ),
          'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'shape': SchemaNode.defineConst({}, shape)
        },
        ['description', 'expected', 'input', 'name', 'shape'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      );
      return result;
    }
  }

  const capacityErrorSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'capacity-error' as const,
    { 'sampleBuffer': capacityWithExtraSchema },
    ['sampleBuffer'] as const,
    { 'errorName': { 'type': 'string' } },
    ['errorName'] as const
  );
  const capacityErrorNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'capacity-error' as const,
    { 'sampleBuffer': capacityWithExtraNode },
    ['sampleBuffer'] as const,
    { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['errorName'] as const
  );

  const clearResetsSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'clear-resets' as const,
    { 'pct': { 'type': 'number' }, 'pushes': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushes', 'sampleBuffer'] as const,
    { 'full': { 'type': 'boolean' }, 'length': { 'type': 'number' }, 'percentile': nullableNumberSchema },
    ['full', 'length', 'percentile'] as const
  );
  const clearResetsNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'clear-resets' as const,
    {
      'pct': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'pushes': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushes', 'sampleBuffer'] as const,
    {
      'full': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'percentile': nullableNumberNode
    },
    ['full', 'length', 'percentile'] as const
  );

  const constructionSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'construction' as const,
    { 'sampleBuffer': capacitySchema },
    ['sampleBuffer'] as const,
    { 'full': { 'type': 'boolean' }, 'length': { 'type': 'number' } },
    ['full', 'length'] as const
  );
  const constructionNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'construction' as const,
    { 'sampleBuffer': capacityNode },
    ['sampleBuffer'] as const,
    {
      'full': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['full', 'length'] as const
  );

  const invalidMultiErrorSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'invalid-multi-error' as const,
    { 'sampleBuffer': capacityWithExtraSchema },
    ['sampleBuffer'] as const,
    { 'errorName': { 'type': 'string' }, 'messageIncludes': stringArraySchema },
    ['errorName', 'messageIncludes'] as const
  );
  const invalidMultiErrorNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'invalid-multi-error' as const,
    { 'sampleBuffer': capacityWithExtraNode },
    ['sampleBuffer'] as const,
    {
      'errorName': SchemaNode.defineString({ 'type': 'string' } as const),
      'messageIncludes': stringArrayNode
    },
    ['errorName', 'messageIncludes'] as const
  );

  const isFullSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'is-full' as const,
    { 'pushes': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushes', 'sampleBuffer'] as const,
    { 'full': { 'type': 'boolean' } },
    ['full'] as const
  );
  const isFullNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'is-full' as const,
    { 'pushes': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushes', 'sampleBuffer'] as const,
    { 'full': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
    ['full'] as const
  );

  const maintainsLengthSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'maintains-length' as const,
    { 'pushes': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushes', 'sampleBuffer'] as const,
    { 'isFull': { 'type': 'boolean' }, 'length': { 'type': 'number' } },
    ['isFull', 'length'] as const
  );
  const maintainsLengthNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'maintains-length' as const,
    { 'pushes': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushes', 'sampleBuffer'] as const,
    {
      'isFull': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['isFull', 'length'] as const
  );

  const overwritesOldestSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'overwrites-oldest' as const,
    { 'pct': { 'type': 'number' }, 'pushes': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushes', 'sampleBuffer'] as const,
    { 'isFull': { 'type': 'boolean' }, 'length': { 'type': 'number' }, 'percentile': { 'type': 'number' } },
    ['isFull', 'length', 'percentile'] as const
  );
  const overwritesOldestNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'overwrites-oldest' as const,
    {
      'pct': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'pushes': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushes', 'sampleBuffer'] as const,
    {
      'isFull': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'percentile': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['isFull', 'length', 'percentile'] as const
  );

  const percentileSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'percentile' as const,
    { 'pct': { 'type': 'number' }, 'sampleBuffer': capacitySchema, 'samples': numberArraySchema },
    ['pct', 'sampleBuffer', 'samples'] as const,
    { 'percentile': nullableNumberSchema },
    ['percentile'] as const
  );
  const percentileNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'percentile' as const,
    {
      'pct': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'sampleBuffer': capacityNode,
      'samples': numberArrayNode
    },
    ['pct', 'sampleBuffer', 'samples'] as const,
    { 'percentile': nullableNumberNode },
    ['percentile'] as const
  );

  const batchSchema = {
    'additionalProperties': false,
    'properties': { 'sampleCount': { 'type': 'number' } },
    'required': ['sampleCount'],
    'type': 'object'
  } as const;
  const batchNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'sampleCount': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['sampleCount'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const percentileBatchSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'percentile-batch' as const,
    {
      'batch': batchSchema,
      'pct': { 'type': 'number' },
      'sampleBuffer': capacitySchema,
      'startValue': { 'type': 'number' }
    },
    ['batch', 'pct', 'sampleBuffer', 'startValue'] as const,
    { 'percentile': { 'type': 'number' } },
    ['percentile'] as const
  );
  const percentileBatchNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'percentile-batch' as const,
    {
      'batch': batchNode,
      'pct': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'sampleBuffer': capacityNode,
      'startValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['batch', 'pct', 'sampleBuffer', 'startValue'] as const,
    { 'percentile': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['percentile'] as const
  );

  const pushLengthsSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'push-lengths' as const,
    { 'pushes': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushes', 'sampleBuffer'] as const,
    { 'lengths': numberArraySchema },
    ['lengths'] as const
  );
  const pushLengthsNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'push-lengths' as const,
    { 'pushes': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushes', 'sampleBuffer'] as const,
    { 'lengths': numberArrayNode },
    ['lengths'] as const
  );

  const recalculateAfterPushSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'recalculate-after-push' as const,
    {
      'pct': { 'type': 'number' },
      'pushAfter': { 'type': 'number' },
      'pushes': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushAfter', 'pushes', 'sampleBuffer'] as const,
    { 'percentileAfter': { 'type': 'number' }, 'percentileBefore': { 'type': 'number' } },
    ['percentileAfter', 'percentileBefore'] as const
  );
  const recalculateAfterPushNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'recalculate-after-push' as const,
    {
      'pct': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'pushAfter': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'pushes': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushAfter', 'pushes', 'sampleBuffer'] as const,
    {
      'percentileAfter': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'percentileBefore': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['percentileAfter', 'percentileBefore'] as const
  );

  const reuseAfterClearSchema = SampleBufferScenarioCaseEntityBuilders.branchSchema(
    'reuse-after-clear' as const,
    {
      'firstPushes': numberArraySchema,
      'pct': { 'type': 'number' },
      'sampleBuffer': capacitySchema,
      'secondPushes': numberArraySchema
    },
    ['firstPushes', 'pct', 'sampleBuffer', 'secondPushes'] as const,
    { 'length': { 'type': 'number' }, 'percentile': { 'type': 'number' } },
    ['length', 'percentile'] as const
  );
  const reuseAfterClearNode = SampleBufferScenarioCaseEntityBuilders.branchNode(
    'reuse-after-clear' as const,
    {
      'firstPushes': numberArrayNode,
      'pct': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'sampleBuffer': capacityNode,
      'secondPushes': numberArrayNode
    },
    ['firstPushes', 'pct', 'sampleBuffer', 'secondPushes'] as const,
    {
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'percentile': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['length', 'percentile'] as const
  );

  export const Schema = {
    'oneOf': [
      capacityErrorSchema,
      clearResetsSchema,
      constructionSchema,
      invalidMultiErrorSchema,
      isFullSchema,
      maintainsLengthSchema,
      overwritesOldestSchema,
      percentileSchema,
      percentileBatchSchema,
      pushLengthsSchema,
      recalculateAfterPushSchema,
      reuseAfterClearSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    capacityErrorNode,
    clearResetsNode,
    constructionNode,
    invalidMultiErrorNode,
    isFullNode,
    maintainsLengthNode,
    overwritesOldestNode,
    percentileNode,
    percentileBatchNode,
    pushLengthsNode,
    recalculateAfterPushNode,
    reuseAfterClearNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
