import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface,
  SchemaNodeInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * The thirty scenario case shapes `SampleBufferSubclass.loop.spec.ts` exercises against subclass
 * lifecycle hooks. `throwing-on-overflow` and `throwing-on-evict` share identical input/expected
 * field shapes but stay separate branches: each drives a different hook under test.
 */
export namespace SampleBufferSubclassScenarioCaseEntity {
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

  const pushLogEntrySchema = {
    'additionalProperties': false,
    'properties': { 'evicted': { 'type': 'boolean' }, 'value': { 'type': 'number' } },
    'required': ['evicted', 'value'],
    'type': 'object'
  } as const;
  const pushLogEntryNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'evicted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['evicted', 'value'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  const pushLogArraySchema = { 'items': pushLogEntrySchema, 'type': 'array' } as const;
  const pushLogArrayNode = SchemaNode.defineArray(
    { 'type': 'array' } as const,
    pushLogEntryNode,
    undefined
  );

  const stateSchema = {
    'additionalProperties': false,
    'properties': {
      'cacheNull': { 'type': 'boolean' },
      'capacity': { 'type': 'number' },
      'head': { 'type': 'number' },
      'length': { 'type': 'number' }
    },
    'required': ['cacheNull', 'capacity', 'head', 'length'],
    'type': 'object'
  } as const;
  const stateNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'cacheNull': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'head': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['cacheNull', 'capacity', 'head', 'length'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const percentilesAtEdgesSchema = {
    'additionalProperties': false,
    'properties': { '0': { 'type': 'number' }, '100': { 'type': 'number' } },
    'required': ['0', '100'],
    'type': 'object'
  } as const;
  const percentilesAtEdgesNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      '0': SchemaNode.defineNumber({ 'type': 'number' } as const),
      '100': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['0', '100'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const percentilesQuartileSchema = {
    'additionalProperties': false,
    'properties': {
      '0': { 'type': 'number' },
      '100': { 'type': 'number' },
      '25': { 'type': 'number' },
      '50': { 'type': 'number' }
    },
    'required': ['0', '100', '25', '50'],
    'type': 'object'
  } as const;
  const percentilesQuartileNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      '0': SchemaNode.defineNumber({ 'type': 'number' } as const),
      '100': SchemaNode.defineNumber({ 'type': 'number' } as const),
      '25': SchemaNode.defineNumber({ 'type': 'number' } as const),
      '50': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['0', '100', '25', '50'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const emptyTupleSchema = { 'items': false, 'prefixItems': [], 'type': 'array' } as const;
  const emptyTupleNode = SchemaNode.defineTuple(
    { 'items': false, 'type': 'array' } as const,
    [] as const
  );

  class SampleBufferSubclassScenarioCaseEntityBuilders {
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

    static numberValue(): { 'type': 'number' } {
      const result: { 'type': 'number' } = { 'type': 'number' };
      return result;
    }

    static numberValueNode(): ReturnType<typeof SchemaNode.defineNumber<{ 'type': 'number' }>> {
      const result: ReturnType<typeof SchemaNode.defineNumber<{ 'type': 'number' }>> =
        SchemaNode.defineNumber({ 'type': 'number' } as const);
      return result;
    }
  }

  const onEvictSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-evict' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'evictedValues': numberArraySchema },
    ['evictedValues'] as const
  );
  const onEvictNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-evict' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'evictedValues': numberArrayNode },
    ['evictedValues'] as const
  );

  const onEvictBeforeOverwriteSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-evict-before-overwrite' as const,
    { 'sampleBuffer': capacitySchema, 'values': numberArraySchema },
    ['sampleBuffer', 'values'] as const,
    { 'capturedOldValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['capturedOldValue'] as const
  );
  const onEvictBeforeOverwriteNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-evict-before-overwrite' as const,
    { 'sampleBuffer': capacityNode, 'values': numberArrayNode },
    ['sampleBuffer', 'values'] as const,
    { 'capturedOldValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['capturedOldValue'] as const
  );

  const onPushSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-push' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'pushLog': pushLogArraySchema },
    ['pushLog'] as const
  );
  const onPushNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-push' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'pushLog': pushLogArrayNode },
    ['pushLog'] as const
  );

  const onPushLengthUpdateSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-push-length-update' as const,
    {
      'sampleBuffer': capacitySchema,
      'value': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue()
    },
    ['sampleBuffer', 'value'] as const,
    { 'lengthAtHook': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['lengthAtHook'] as const
  );
  const onPushLengthUpdateNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-push-length-update' as const,
    {
      'sampleBuffer': capacityNode,
      'value': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode()
    },
    ['sampleBuffer', 'value'] as const,
    { 'lengthAtHook': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['lengthAtHook'] as const
  );

  const onClearSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-clear' as const,
    {
      'clearTimes': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['clearTimes', 'pushItems', 'sampleBuffer'] as const,
    { 'clearCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['clearCount'] as const
  );
  const onClearNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-clear' as const,
    {
      'clearTimes': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['clearTimes', 'pushItems', 'sampleBuffer'] as const,
    { 'clearCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['clearCount'] as const
  );

  const onClearBeforeResetSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-clear-before-reset' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'lengthAtHook': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['lengthAtHook'] as const
  );
  const onClearBeforeResetNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-clear-before-reset' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'lengthAtHook': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['lengthAtHook'] as const
  );

  const onPercentileCalledSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-percentile-called' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'result': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'resultType': { 'type': 'string' }
    },
    ['pct', 'result', 'resultType'] as const
  );
  const onPercentileCalledNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-percentile-called' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'result': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'resultType': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['pct', 'result', 'resultType'] as const
  );

  const onPercentileAbsentWhenEmptySchema =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
      'on-percentile-absent-when-empty' as const,
      {
        'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
        'sampleBuffer': capacitySchema
      },
      ['pct', 'sampleBuffer'] as const,
      { 'percentileLogLength': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
      ['percentileLogLength'] as const
    );
  const onPercentileAbsentWhenEmptyNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-percentile-absent-when-empty' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'sampleBuffer': capacityNode
    },
    ['pct', 'sampleBuffer'] as const,
    { 'percentileLogLength': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['percentileLogLength'] as const
  );

  const onPercentileResultMatchesReturnSchema =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
      'on-percentile-result-matches-return' as const,
      {
        'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
        'pushItems': numberArraySchema,
        'sampleBuffer': capacitySchema
      },
      ['pct', 'pushItems', 'sampleBuffer'] as const,
      { 'result': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
      ['result'] as const
    );
  const onPercentileResultMatchesReturnNode =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
      'on-percentile-result-matches-return' as const,
      {
        'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
        'pushItems': numberArrayNode,
        'sampleBuffer': capacityNode
      },
      ['pct', 'pushItems', 'sampleBuffer'] as const,
      { 'result': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
      ['result'] as const
    );

  const onPercentileEdgeCasesSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-percentile-edge-cases' as const,
    { 'percentiles': numberArraySchema, 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['percentiles', 'pushItems', 'sampleBuffer'] as const,
    { 'results': numberArraySchema },
    ['results'] as const
  );
  const onPercentileEdgeCasesNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-percentile-edge-cases' as const,
    { 'percentiles': numberArrayNode, 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['percentiles', 'pushItems', 'sampleBuffer'] as const,
    { 'results': numberArrayNode },
    ['results'] as const
  );

  const onOverflowNotFullSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-overflow-not-full' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['overflowCount'] as const
  );
  const onOverflowNotFullNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-overflow-not-full' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['overflowCount'] as const
  );

  const onOverflowFullSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-overflow-full' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    {
      'overflowCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'overflowValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue()
    },
    ['overflowCount', 'overflowValue'] as const
  );
  const onOverflowFullNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-overflow-full' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    {
      'overflowCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'overflowValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode()
    },
    ['overflowCount', 'overflowValue'] as const
  );

  const onOverflowBeforeOnEvictSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-overflow-before-on-evict' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'events': stringArraySchema },
    ['events'] as const
  );
  const onOverflowBeforeOnEvictNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-overflow-before-on-evict' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'events': stringArrayNode },
    ['events'] as const
  );

  const onOverflowIncomingValueSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-overflow-incoming-value' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['overflowValue'] as const
  );
  const onOverflowIncomingValueNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-overflow-incoming-value' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['overflowValue'] as const
  );

  const onComputeStartEmptySchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-compute-start-empty' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'sampleBuffer': capacitySchema
    },
    ['pct', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArraySchema },
    ['computeStartLengths'] as const
  );
  const onComputeStartEmptyNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-compute-start-empty' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'sampleBuffer': capacityNode
    },
    ['pct', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArrayNode },
    ['computeStartLengths'] as const
  );

  const onComputeStartCacheMissSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-compute-start-cache-miss' as const,
    {
      'calls': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['calls', 'pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArraySchema },
    ['computeStartLengths'] as const
  );
  const onComputeStartCacheMissNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-compute-start-cache-miss' as const,
    {
      'calls': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['calls', 'pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArrayNode },
    ['computeStartLengths'] as const
  );

  const onComputeStartLengthSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-compute-start-length' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLength': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
    ['computeStartLength'] as const
  );
  const onComputeStartLengthNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-compute-start-length' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLength': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
    ['computeStartLength'] as const
  );

  const onComputeCompleteSortedSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-compute-complete-sorted' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'sorted': numberArraySchema },
    ['sorted'] as const
  );
  const onComputeCompleteSortedNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-compute-complete-sorted' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'sorted': numberArrayNode },
    ['sorted'] as const
  );

  const onComputeCompleteEmptySchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'on-compute-complete-empty' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'sampleBuffer': capacitySchema
    },
    ['pct', 'sampleBuffer'] as const,
    { 'computeCompletes': emptyTupleSchema },
    ['computeCompletes'] as const
  );
  const onComputeCompleteEmptyNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'on-compute-complete-empty' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'sampleBuffer': capacityNode
    },
    ['pct', 'sampleBuffer'] as const,
    { 'computeCompletes': emptyTupleNode },
    ['computeCompletes'] as const
  );

  const onComputeStartAfterInvalidationSchema =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
      'on-compute-start-after-invalidation' as const,
      {
        'initialPushItems': numberArraySchema,
        'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
        'pushAfter': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
        'sampleBuffer': capacitySchema
      },
      ['initialPushItems', 'pct', 'pushAfter', 'sampleBuffer'] as const,
      { 'computeStartCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue() },
      ['computeStartCount'] as const
    );
  const onComputeStartAfterInvalidationNode =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
      'on-compute-start-after-invalidation' as const,
      {
        'initialPushItems': numberArrayNode,
        'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
        'pushAfter': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
        'sampleBuffer': capacityNode
      },
      ['initialPushItems', 'pct', 'pushAfter', 'sampleBuffer'] as const,
      { 'computeStartCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode() },
      ['computeStartCount'] as const
    );

  const inspectProtectedFieldsSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'inspect-protected-fields' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'state': stateSchema },
    ['state'] as const
  );
  const inspectProtectedFieldsNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'inspect-protected-fields' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'state': stateNode },
    ['state'] as const
  );

  const throwingOnPushSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'throwing-on-push' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushValue', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentile': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue()
    },
    ['length', 'percentile'] as const
  );
  const throwingOnPushNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'throwing-on-push' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushValue', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentile': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode()
    },
    ['length', 'percentile'] as const
  );

  const throwingOnOverflowSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'throwing-on-overflow' as const,
    {
      'overflowPush': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentiles': numberArraySchema,
      'primingPushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentiles': percentilesAtEdgesSchema
    },
    ['length', 'percentiles'] as const
  );
  const throwingOnOverflowNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'throwing-on-overflow' as const,
    {
      'overflowPush': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentiles': numberArrayNode,
      'primingPushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentiles': percentilesAtEdgesNode
    },
    ['length', 'percentiles'] as const
  );

  const throwingOnEvictSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'throwing-on-evict' as const,
    {
      'overflowPush': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentiles': numberArraySchema,
      'primingPushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentiles': percentilesAtEdgesSchema
    },
    ['length', 'percentiles'] as const
  );
  const throwingOnEvictNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'throwing-on-evict' as const,
    {
      'overflowPush': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentiles': numberArrayNode,
      'primingPushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentiles': percentilesAtEdgesNode
    },
    ['length', 'percentiles'] as const
  );

  const throwingOnClearSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'throwing-on-clear' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentile': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue()
    },
    ['length', 'percentile'] as const
  );
  const throwingOnClearNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'throwing-on-clear' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentile': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode()
    },
    ['length', 'percentile'] as const
  );

  const throwingOnPercentileSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'throwing-on-percentile' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': { 'type': 'string' } },
    ['errorName'] as const
  );
  const throwingOnPercentileNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'throwing-on-percentile' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['errorName'] as const
  );

  const throwingOnComputeStartSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'throwing-on-compute-start' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': { 'type': 'string' } },
    ['errorName'] as const
  );
  const throwingOnComputeStartNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'throwing-on-compute-start' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['errorName'] as const
  );

  const hookInvocationErrorCauseSchema =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
      'hook-invocation-error-cause' as const,
      {
        'pushValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
        'sampleBuffer': capacitySchema
      },
      ['pushValue', 'sampleBuffer'] as const,
      { 'causeMessage': { 'type': 'string' }, 'hookName': { 'type': 'string' } },
      ['causeMessage', 'hookName'] as const
    );
  const hookInvocationErrorCauseNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'hook-invocation-error-cause' as const,
    {
      'pushValue': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'sampleBuffer': capacityNode
    },
    ['pushValue', 'sampleBuffer'] as const,
    {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'hookName': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['causeMessage', 'hookName'] as const
  );

  const asyncPushRejectionSafeSchema = SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
    'async-push-rejection-safe' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'pushItems': numberArraySchema,
      'sampleBuffer': capacitySchema
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'percentile': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
      'rejectionCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue()
    },
    ['length', 'percentile', 'rejectionCount'] as const
  );
  const asyncPushRejectionSafeNode = SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
    'async-push-rejection-safe' as const,
    {
      'pct': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'pushItems': numberArrayNode,
      'sampleBuffer': capacityNode
    },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    {
      'length': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'percentile': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
      'rejectionCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode()
    },
    ['length', 'percentile', 'rejectionCount'] as const
  );

  const asyncPercentileRejectionSafeSchema =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchSchema(
      'async-percentile-rejection-safe' as const,
      {
        'percentiles': numberArraySchema,
        'pushItems': numberArraySchema,
        'sampleBuffer': capacitySchema
      },
      ['percentiles', 'pushItems', 'sampleBuffer'] as const,
      {
        'rejectionCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValue(),
        'results': percentilesQuartileSchema
      },
      ['rejectionCount', 'results'] as const
    );
  const asyncPercentileRejectionSafeNode =
    SampleBufferSubclassScenarioCaseEntityBuilders.branchNode(
      'async-percentile-rejection-safe' as const,
      { 'percentiles': numberArrayNode, 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
      ['percentiles', 'pushItems', 'sampleBuffer'] as const,
      {
        'rejectionCount': SampleBufferSubclassScenarioCaseEntityBuilders.numberValueNode(),
        'results': percentilesQuartileNode
      },
      ['rejectionCount', 'results'] as const
    );

  export const Schema = {
    'oneOf': [
      onEvictSchema,
      onEvictBeforeOverwriteSchema,
      onPushSchema,
      onPushLengthUpdateSchema,
      onClearSchema,
      onClearBeforeResetSchema,
      onPercentileCalledSchema,
      onPercentileAbsentWhenEmptySchema,
      onPercentileResultMatchesReturnSchema,
      onPercentileEdgeCasesSchema,
      onOverflowNotFullSchema,
      onOverflowFullSchema,
      onOverflowBeforeOnEvictSchema,
      onOverflowIncomingValueSchema,
      onComputeStartEmptySchema,
      onComputeStartCacheMissSchema,
      onComputeStartLengthSchema,
      onComputeCompleteSortedSchema,
      onComputeCompleteEmptySchema,
      onComputeStartAfterInvalidationSchema,
      inspectProtectedFieldsSchema,
      throwingOnPushSchema,
      throwingOnOverflowSchema,
      throwingOnEvictSchema,
      throwingOnClearSchema,
      throwingOnPercentileSchema,
      throwingOnComputeStartSchema,
      hookInvocationErrorCauseSchema,
      asyncPushRejectionSafeSchema,
      asyncPercentileRejectionSafeSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    onEvictNode,
    onEvictBeforeOverwriteNode,
    onPushNode,
    onPushLengthUpdateNode,
    onClearNode,
    onClearBeforeResetNode,
    onPercentileCalledNode,
    onPercentileAbsentWhenEmptyNode,
    onPercentileResultMatchesReturnNode,
    onPercentileEdgeCasesNode,
    onOverflowNotFullNode,
    onOverflowFullNode,
    onOverflowBeforeOnEvictNode,
    onOverflowIncomingValueNode,
    onComputeStartEmptyNode,
    onComputeStartCacheMissNode,
    onComputeStartLengthNode,
    onComputeCompleteSortedNode,
    onComputeCompleteEmptyNode,
    onComputeStartAfterInvalidationNode,
    inspectProtectedFieldsNode,
    throwingOnPushNode,
    throwingOnOverflowNode,
    throwingOnEvictNode,
    throwingOnClearNode,
    throwingOnPercentileNode,
    throwingOnComputeStartNode,
    hookInvocationErrorCauseNode,
    asyncPushRejectionSafeNode,
    asyncPercentileRejectionSafeNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
