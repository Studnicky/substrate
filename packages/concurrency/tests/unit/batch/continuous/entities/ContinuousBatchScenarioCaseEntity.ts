import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const descriptionSchema = { 'minLength': 1, 'type': 'string' } as const;
const descriptionNode = SchemaNode.defineString(descriptionSchema);

/** Builds the `{ description, expected, input, name, shape }` envelope every branch shares, varying only the discriminant and the two payloads. */
class ScenarioBranchBuilders {
  static branchSchema<
    const TShape extends string,
    const TInputSchema extends Record<string, unknown>,
    const TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': descriptionSchema,
        'expected': expectedSchema,
        'input': inputSchema,
        'name': descriptionSchema,
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': descriptionNode,
      'expected': expectedNode,
      'input': inputNode,
      'name': descriptionNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

// empty-input
const branch1Schema = ScenarioBranchBuilders.branchSchema('empty-input', { 'additionalProperties': false, 'properties': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'maximumConcurrent': { 'type': 'number' } }, 'required': ['items', 'maximumConcurrent'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'batchCompleteCount': { 'type': 'number' }, 'batchStartCount': { 'type': 'number' }, 'results': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['batchCompleteCount', 'batchStartCount', 'results'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('empty-input', SchemaNode.defineObject({ 'type': 'object' } as const, { 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), 'maximumConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['items', 'maximumConcurrent'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'batchCompleteCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'batchStartCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined) }, ['batchCompleteCount', 'batchStartCount', 'results'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// fail-fast-completion
const branch2Schema = ScenarioBranchBuilders.branchSchema('fail-fast-completion', { 'additionalProperties': false, 'properties': { 'failure': { 'type': 'number' }, 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'maximumConcurrent': { 'type': 'number' }, 'rejectionDeadlineMs': { 'type': 'number' } }, 'required': ['failure', 'items', 'maximumConcurrent', 'rejectionDeadlineMs'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'rejectedMessage': { 'type': 'string' }, 'stats': { 'additionalProperties': false, 'properties': { 'failed': { 'type': 'number' }, 'succeeded': { 'type': 'number' }, 'total': { 'type': 'number' } }, 'required': ['failed', 'succeeded', 'total'], 'type': 'object' } }, 'required': ['rejectedMessage', 'stats'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('fail-fast-completion', SchemaNode.defineObject({ 'type': 'object' } as const, { 'failure': SchemaNode.defineNumber({ 'type': 'number' } as const), 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), 'maximumConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const), 'rejectionDeadlineMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['failure', 'items', 'maximumConcurrent', 'rejectionDeadlineMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'rejectedMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'stats': SchemaNode.defineObject({ 'type': 'object' } as const, { 'failed': SchemaNode.defineNumber({ 'type': 'number' } as const), 'succeeded': SchemaNode.defineNumber({ 'type': 'number' } as const), 'total': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['failed', 'succeeded', 'total'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['rejectedMessage', 'stats'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// immediate-refill
const branch3Schema = ScenarioBranchBuilders.branchSchema('immediate-refill', { 'additionalProperties': false, 'properties': { 'fastDelayMs': { 'type': 'number' }, 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'maximumConcurrent': { 'type': 'number' }, 'slowDelayMs': { 'type': 'number' } }, 'required': ['fastDelayMs', 'items', 'maximumConcurrent', 'slowDelayMs'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'refilledBeforeSlowestFinished': { 'type': 'boolean' }, 'results': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['refilledBeforeSlowestFinished', 'results'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('immediate-refill', SchemaNode.defineObject({ 'type': 'object' } as const, { 'fastDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), 'maximumConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const), 'slowDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['fastDelayMs', 'items', 'maximumConcurrent', 'slowDelayMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'refilledBeforeSlowestFinished': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined) }, ['refilledBeforeSlowestFinished', 'results'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// settled-results
const branch4Schema = ScenarioBranchBuilders.branchSchema('settled-results', { 'additionalProperties': false, 'properties': { 'failure': { 'type': 'number' }, 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'maximumConcurrent': { 'type': 'number' } }, 'required': ['failure', 'items', 'maximumConcurrent'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'statuses': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['statuses'], 'type': 'object' });
const branch4Node = ScenarioBranchBuilders.branchNode('settled-results', SchemaNode.defineObject({ 'type': 'object' } as const, { 'failure': SchemaNode.defineNumber({ 'type': 'number' } as const), 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), 'maximumConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['failure', 'items', 'maximumConcurrent'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'statuses': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['statuses'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace ContinuousBatchScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema,
      branch4Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
