import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

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
    { 'additionalProperties': false }
  );

  const numberArraySchema = { 'items': { 'type': 'number' }, 'type': 'array' } as const;
  const numberArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const));

  const stringArraySchema = { 'items': { 'type': 'string' }, 'type': 'array' } as const;
  const stringArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const));

  const pushLogEntrySchema = {
    'additionalProperties': false,
    'properties': { 'evicted': { 'type': 'boolean' }, 'value': { 'type': 'number' } },
    'required': ['evicted', 'value'],
    'type': 'object'
  } as const;
  const pushLogEntryNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'evicted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['evicted', 'value'] as const,
    { 'additionalProperties': false }
  );
  const pushLogArraySchema = { 'items': pushLogEntrySchema, 'type': 'array' } as const;
  const pushLogArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, pushLogEntryNode);

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
    { 'additionalProperties': false }
  );

  const percentilesAtEdgesSchema = {
    'additionalProperties': false,
    'properties': { '0': { 'type': 'number' }, '100': { 'type': 'number' } },
    'required': ['0', '100'],
    'type': 'object'
  } as const;
  const percentilesAtEdgesNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { '0': SchemaNode.defineNumber({ 'type': 'number' } as const), '100': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['0', '100'] as const,
    { 'additionalProperties': false }
  );

  const percentilesQuartileSchema = {
    'additionalProperties': false,
    'properties': { '0': { 'type': 'number' }, '100': { 'type': 'number' }, '25': { 'type': 'number' }, '50': { 'type': 'number' } },
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
    { 'additionalProperties': false }
  );

  const emptyTupleSchema = { 'items': false, 'prefixItems': [], 'type': 'array' } as const;
  const emptyTupleNode = SchemaNode.defineTuple({ 'items': false, 'type': 'array' } as const, [] as const);

  function branchSchema<
    const TShape extends string,
    const TInputProps extends Record<string, unknown>,
    const TInputRequired extends readonly string[],
    const TExpectedProps extends Record<string, unknown>,
    const TExpectedRequired extends readonly string[]
  >(shape: TShape, inputProperties: TInputProps, inputRequired: TInputRequired, expectedProperties: TExpectedProps, expectedRequired: TExpectedRequired) {
    return {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': { 'additionalProperties': false, 'properties': expectedProperties, 'required': expectedRequired, 'type': 'object' },
        'input': { 'additionalProperties': false, 'properties': inputProperties, 'required': inputRequired, 'type': 'object' },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }

  function branchNode<
    const TShape extends string,
    TInputProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    const TInputRequired extends readonly (keyof TInputProps & string)[],
    TExpectedProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    const TExpectedRequired extends readonly (keyof TExpectedProps & string)[]
  >(shape: TShape, inputProperties: TInputProps, inputRequired: TInputRequired, expectedProperties: TExpectedProps, expectedRequired: TExpectedRequired) {
    return SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, expectedProperties, expectedRequired, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, inputProperties, inputRequired, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst(shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    );
  }

  const num = (): { 'type': 'number' } => ({ 'type': 'number' });
  const numNode = (): ReturnType<typeof SchemaNode.defineNumber<{ 'type': 'number' }>> => SchemaNode.defineNumber({ 'type': 'number' } as const);

  const onEvictSchema = branchSchema(
    'on-evict' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'evictedValues': numberArraySchema },
    ['evictedValues'] as const
  );
  const onEvictNode = branchNode(
    'on-evict' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'evictedValues': numberArrayNode },
    ['evictedValues'] as const
  );

  const onEvictBeforeOverwriteSchema = branchSchema(
    'on-evict-before-overwrite' as const,
    { 'sampleBuffer': capacitySchema, 'values': numberArraySchema },
    ['sampleBuffer', 'values'] as const,
    { 'capturedOldValue': num() },
    ['capturedOldValue'] as const
  );
  const onEvictBeforeOverwriteNode = branchNode(
    'on-evict-before-overwrite' as const,
    { 'sampleBuffer': capacityNode, 'values': numberArrayNode },
    ['sampleBuffer', 'values'] as const,
    { 'capturedOldValue': numNode() },
    ['capturedOldValue'] as const
  );

  const onPushSchema = branchSchema(
    'on-push' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'pushLog': pushLogArraySchema },
    ['pushLog'] as const
  );
  const onPushNode = branchNode(
    'on-push' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'pushLog': pushLogArrayNode },
    ['pushLog'] as const
  );

  const onPushLengthUpdateSchema = branchSchema(
    'on-push-length-update' as const,
    { 'sampleBuffer': capacitySchema, 'value': num() },
    ['sampleBuffer', 'value'] as const,
    { 'lengthAtHook': num() },
    ['lengthAtHook'] as const
  );
  const onPushLengthUpdateNode = branchNode(
    'on-push-length-update' as const,
    { 'sampleBuffer': capacityNode, 'value': numNode() },
    ['sampleBuffer', 'value'] as const,
    { 'lengthAtHook': numNode() },
    ['lengthAtHook'] as const
  );

  const onClearSchema = branchSchema(
    'on-clear' as const,
    { 'clearTimes': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['clearTimes', 'pushItems', 'sampleBuffer'] as const,
    { 'clearCount': num() },
    ['clearCount'] as const
  );
  const onClearNode = branchNode(
    'on-clear' as const,
    { 'clearTimes': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['clearTimes', 'pushItems', 'sampleBuffer'] as const,
    { 'clearCount': numNode() },
    ['clearCount'] as const
  );

  const onClearBeforeResetSchema = branchSchema(
    'on-clear-before-reset' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'lengthAtHook': num() },
    ['lengthAtHook'] as const
  );
  const onClearBeforeResetNode = branchNode(
    'on-clear-before-reset' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'lengthAtHook': numNode() },
    ['lengthAtHook'] as const
  );

  const onPercentileCalledSchema = branchSchema(
    'on-percentile-called' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'pct': num(), 'result': num(), 'resultType': { 'type': 'string' } },
    ['pct', 'result', 'resultType'] as const
  );
  const onPercentileCalledNode = branchNode(
    'on-percentile-called' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'pct': numNode(), 'result': numNode(), 'resultType': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['pct', 'result', 'resultType'] as const
  );

  const onPercentileAbsentWhenEmptySchema = branchSchema(
    'on-percentile-absent-when-empty' as const,
    { 'pct': num(), 'sampleBuffer': capacitySchema },
    ['pct', 'sampleBuffer'] as const,
    { 'percentileLogLength': num() },
    ['percentileLogLength'] as const
  );
  const onPercentileAbsentWhenEmptyNode = branchNode(
    'on-percentile-absent-when-empty' as const,
    { 'pct': numNode(), 'sampleBuffer': capacityNode },
    ['pct', 'sampleBuffer'] as const,
    { 'percentileLogLength': numNode() },
    ['percentileLogLength'] as const
  );

  const onPercentileResultMatchesReturnSchema = branchSchema(
    'on-percentile-result-matches-return' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'result': num() },
    ['result'] as const
  );
  const onPercentileResultMatchesReturnNode = branchNode(
    'on-percentile-result-matches-return' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'result': numNode() },
    ['result'] as const
  );

  const onPercentileEdgeCasesSchema = branchSchema(
    'on-percentile-edge-cases' as const,
    { 'percentiles': numberArraySchema, 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['percentiles', 'pushItems', 'sampleBuffer'] as const,
    { 'results': numberArraySchema },
    ['results'] as const
  );
  const onPercentileEdgeCasesNode = branchNode(
    'on-percentile-edge-cases' as const,
    { 'percentiles': numberArrayNode, 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['percentiles', 'pushItems', 'sampleBuffer'] as const,
    { 'results': numberArrayNode },
    ['results'] as const
  );

  const onOverflowNotFullSchema = branchSchema(
    'on-overflow-not-full' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowCount': num() },
    ['overflowCount'] as const
  );
  const onOverflowNotFullNode = branchNode(
    'on-overflow-not-full' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowCount': numNode() },
    ['overflowCount'] as const
  );

  const onOverflowFullSchema = branchSchema(
    'on-overflow-full' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowCount': num(), 'overflowValue': num() },
    ['overflowCount', 'overflowValue'] as const
  );
  const onOverflowFullNode = branchNode(
    'on-overflow-full' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowCount': numNode(), 'overflowValue': numNode() },
    ['overflowCount', 'overflowValue'] as const
  );

  const onOverflowBeforeOnEvictSchema = branchSchema(
    'on-overflow-before-on-evict' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'events': stringArraySchema },
    ['events'] as const
  );
  const onOverflowBeforeOnEvictNode = branchNode(
    'on-overflow-before-on-evict' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'events': stringArrayNode },
    ['events'] as const
  );

  const onOverflowIncomingValueSchema = branchSchema(
    'on-overflow-incoming-value' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowValue': num() },
    ['overflowValue'] as const
  );
  const onOverflowIncomingValueNode = branchNode(
    'on-overflow-incoming-value' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'overflowValue': numNode() },
    ['overflowValue'] as const
  );

  const onComputeStartEmptySchema = branchSchema(
    'on-compute-start-empty' as const,
    { 'pct': num(), 'sampleBuffer': capacitySchema },
    ['pct', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArraySchema },
    ['computeStartLengths'] as const
  );
  const onComputeStartEmptyNode = branchNode(
    'on-compute-start-empty' as const,
    { 'pct': numNode(), 'sampleBuffer': capacityNode },
    ['pct', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArrayNode },
    ['computeStartLengths'] as const
  );

  const onComputeStartCacheMissSchema = branchSchema(
    'on-compute-start-cache-miss' as const,
    { 'calls': num(), 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['calls', 'pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArraySchema },
    ['computeStartLengths'] as const
  );
  const onComputeStartCacheMissNode = branchNode(
    'on-compute-start-cache-miss' as const,
    { 'calls': numNode(), 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['calls', 'pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLengths': numberArrayNode },
    ['computeStartLengths'] as const
  );

  const onComputeStartLengthSchema = branchSchema(
    'on-compute-start-length' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLength': num() },
    ['computeStartLength'] as const
  );
  const onComputeStartLengthNode = branchNode(
    'on-compute-start-length' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'computeStartLength': numNode() },
    ['computeStartLength'] as const
  );

  const onComputeCompleteSortedSchema = branchSchema(
    'on-compute-complete-sorted' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'sorted': numberArraySchema },
    ['sorted'] as const
  );
  const onComputeCompleteSortedNode = branchNode(
    'on-compute-complete-sorted' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'sorted': numberArrayNode },
    ['sorted'] as const
  );

  const onComputeCompleteEmptySchema = branchSchema(
    'on-compute-complete-empty' as const,
    { 'pct': num(), 'sampleBuffer': capacitySchema },
    ['pct', 'sampleBuffer'] as const,
    { 'computeCompletes': emptyTupleSchema },
    ['computeCompletes'] as const
  );
  const onComputeCompleteEmptyNode = branchNode(
    'on-compute-complete-empty' as const,
    { 'pct': numNode(), 'sampleBuffer': capacityNode },
    ['pct', 'sampleBuffer'] as const,
    { 'computeCompletes': emptyTupleNode },
    ['computeCompletes'] as const
  );

  const onComputeStartAfterInvalidationSchema = branchSchema(
    'on-compute-start-after-invalidation' as const,
    { 'initialPushItems': numberArraySchema, 'pct': num(), 'pushAfter': num(), 'sampleBuffer': capacitySchema },
    ['initialPushItems', 'pct', 'pushAfter', 'sampleBuffer'] as const,
    { 'computeStartCount': num() },
    ['computeStartCount'] as const
  );
  const onComputeStartAfterInvalidationNode = branchNode(
    'on-compute-start-after-invalidation' as const,
    { 'initialPushItems': numberArrayNode, 'pct': numNode(), 'pushAfter': numNode(), 'sampleBuffer': capacityNode },
    ['initialPushItems', 'pct', 'pushAfter', 'sampleBuffer'] as const,
    { 'computeStartCount': numNode() },
    ['computeStartCount'] as const
  );

  const inspectProtectedFieldsSchema = branchSchema(
    'inspect-protected-fields' as const,
    { 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pushItems', 'sampleBuffer'] as const,
    { 'state': stateSchema },
    ['state'] as const
  );
  const inspectProtectedFieldsNode = branchNode(
    'inspect-protected-fields' as const,
    { 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pushItems', 'sampleBuffer'] as const,
    { 'state': stateNode },
    ['state'] as const
  );

  const throwingOnPushSchema = branchSchema(
    'throwing-on-push' as const,
    { 'pct': num(), 'pushValue': num(), 'sampleBuffer': capacitySchema },
    ['pct', 'pushValue', 'sampleBuffer'] as const,
    { 'length': num(), 'percentile': num() },
    ['length', 'percentile'] as const
  );
  const throwingOnPushNode = branchNode(
    'throwing-on-push' as const,
    { 'pct': numNode(), 'pushValue': numNode(), 'sampleBuffer': capacityNode },
    ['pct', 'pushValue', 'sampleBuffer'] as const,
    { 'length': numNode(), 'percentile': numNode() },
    ['length', 'percentile'] as const
  );

  const throwingOnOverflowSchema = branchSchema(
    'throwing-on-overflow' as const,
    { 'overflowPush': num(), 'percentiles': numberArraySchema, 'primingPushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    { 'length': num(), 'percentiles': percentilesAtEdgesSchema },
    ['length', 'percentiles'] as const
  );
  const throwingOnOverflowNode = branchNode(
    'throwing-on-overflow' as const,
    { 'overflowPush': numNode(), 'percentiles': numberArrayNode, 'primingPushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    { 'length': numNode(), 'percentiles': percentilesAtEdgesNode },
    ['length', 'percentiles'] as const
  );

  const throwingOnEvictSchema = branchSchema(
    'throwing-on-evict' as const,
    { 'overflowPush': num(), 'percentiles': numberArraySchema, 'primingPushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    { 'length': num(), 'percentiles': percentilesAtEdgesSchema },
    ['length', 'percentiles'] as const
  );
  const throwingOnEvictNode = branchNode(
    'throwing-on-evict' as const,
    { 'overflowPush': numNode(), 'percentiles': numberArrayNode, 'primingPushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['overflowPush', 'percentiles', 'primingPushItems', 'sampleBuffer'] as const,
    { 'length': numNode(), 'percentiles': percentilesAtEdgesNode },
    ['length', 'percentiles'] as const
  );

  const throwingOnClearSchema = branchSchema(
    'throwing-on-clear' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'length': num(), 'percentile': num() },
    ['length', 'percentile'] as const
  );
  const throwingOnClearNode = branchNode(
    'throwing-on-clear' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'length': numNode(), 'percentile': numNode() },
    ['length', 'percentile'] as const
  );

  const throwingOnPercentileSchema = branchSchema(
    'throwing-on-percentile' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': { 'type': 'string' } },
    ['errorName'] as const
  );
  const throwingOnPercentileNode = branchNode(
    'throwing-on-percentile' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['errorName'] as const
  );

  const throwingOnComputeStartSchema = branchSchema(
    'throwing-on-compute-start' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': { 'type': 'string' } },
    ['errorName'] as const
  );
  const throwingOnComputeStartNode = branchNode(
    'throwing-on-compute-start' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['errorName'] as const
  );

  const hookInvocationErrorCauseSchema = branchSchema(
    'hook-invocation-error-cause' as const,
    { 'pushValue': num(), 'sampleBuffer': capacitySchema },
    ['pushValue', 'sampleBuffer'] as const,
    { 'causeMessage': { 'type': 'string' }, 'hookName': { 'type': 'string' } },
    ['causeMessage', 'hookName'] as const
  );
  const hookInvocationErrorCauseNode = branchNode(
    'hook-invocation-error-cause' as const,
    { 'pushValue': numNode(), 'sampleBuffer': capacityNode },
    ['pushValue', 'sampleBuffer'] as const,
    { 'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'hookName': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['causeMessage', 'hookName'] as const
  );

  const asyncPushRejectionSafeSchema = branchSchema(
    'async-push-rejection-safe' as const,
    { 'pct': num(), 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'length': num(), 'percentile': num(), 'rejectionCount': num() },
    ['length', 'percentile', 'rejectionCount'] as const
  );
  const asyncPushRejectionSafeNode = branchNode(
    'async-push-rejection-safe' as const,
    { 'pct': numNode(), 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['pct', 'pushItems', 'sampleBuffer'] as const,
    { 'length': numNode(), 'percentile': numNode(), 'rejectionCount': numNode() },
    ['length', 'percentile', 'rejectionCount'] as const
  );

  const asyncPercentileRejectionSafeSchema = branchSchema(
    'async-percentile-rejection-safe' as const,
    { 'percentiles': numberArraySchema, 'pushItems': numberArraySchema, 'sampleBuffer': capacitySchema },
    ['percentiles', 'pushItems', 'sampleBuffer'] as const,
    { 'rejectionCount': num(), 'results': percentilesQuartileSchema },
    ['rejectionCount', 'results'] as const
  );
  const asyncPercentileRejectionSafeNode = branchNode(
    'async-percentile-rejection-safe' as const,
    { 'percentiles': numberArrayNode, 'pushItems': numberArrayNode, 'sampleBuffer': capacityNode },
    ['percentiles', 'pushItems', 'sampleBuffer'] as const,
    { 'rejectionCount': numNode(), 'results': percentilesQuartileNode },
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

  export const Node = SchemaNode.defineOneOf([
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
}
