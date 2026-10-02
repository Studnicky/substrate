import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 6 scenario shapes `TopicRouter.loop.spec.ts` exercises. */
export namespace TopicRouterScenarioCaseEntity {
  const stringSchema = { 'type': 'string' } as const;
  const stringNode = SchemaNode.defineString(stringSchema);
  const booleanSchema = { 'type': 'boolean' } as const;
  const booleanNode = SchemaNode.defineBoolean(booleanSchema);
  const stringArraySchema = { 'items': stringSchema, 'type': 'array' } as const;
  const stringArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, stringNode, undefined);
  const metadataSchema = {} as const;
  const metadataNode = SchemaNode.defineUnknown(metadataSchema);

  const topicInputSchema = { 'additionalProperties': false, 'properties': { 'topic': stringSchema }, 'required': ['topic'], 'type': 'object' } as const;
  const topicInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'topic': stringNode }, ['topic'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const topicPayloadInputSchema = {
    'additionalProperties': false,
    'properties': { 'payload': stringSchema, 'topic': stringSchema },
    'required': ['payload', 'topic'],
    'type': 'object'
  } as const;
  const topicPayloadInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'payload': stringNode, 'topic': stringNode }, ['payload', 'topic'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const idsDeliveredExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'delivered': stringArraySchema, 'ids': stringArraySchema },
    'required': ['delivered', 'ids'],
    'type': 'object'
  } as const;
  const idsDeliveredExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'delivered': stringArrayNode, 'ids': stringArrayNode }, ['delivered', 'ids'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  /** Builds the `{ expected, input, name, shape }` envelope every branch shares, varying only `shape` and the two payload schemas. */
  class TopicRouterScenarioBuilders {
    static scenarioSchema<
      const TShape extends string,
      TInputSchema extends object,
      TExpectedSchema extends object
    >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
      const result = {
        'additionalProperties': false,
        'properties': {
          'expected': expectedSchema,
          'input': inputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': shape }
        },
        'required': ['expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }
  }

  const matchedPublishSchema = TopicRouterScenarioBuilders.scenarioSchema('matched-publish', topicInputSchema, idsDeliveredExpectedSchema);
  const selectedPublishSchema = TopicRouterScenarioBuilders.scenarioSchema('selected-publish', {
    'additionalProperties': false,
    'properties': { 'id': stringSchema, 'metadata': metadataSchema, 'origin': stringSchema, 'topic': stringSchema },
    'required': ['id', 'metadata', 'origin', 'topic'],
    'type': 'object'
  } as const, {
    'additionalProperties': false,
    'properties': { 'ids': stringArraySchema, 'metadata': metadataSchema, 'origin': stringSchema },
    'required': ['ids', 'metadata', 'origin'],
    'type': 'object'
  } as const);
  const candidateSourceSchema = TopicRouterScenarioBuilders.scenarioSchema('candidate-source', topicPayloadInputSchema, idsDeliveredExpectedSchema);
  const treeCandidateSourceSchema = TopicRouterScenarioBuilders.scenarioSchema('tree-candidate-source', {
    'additionalProperties': false,
    'properties': { 'pattern': stringSchema, 'payload': stringSchema, 'topic': stringSchema },
    'required': ['pattern', 'payload', 'topic'],
    'type': 'object'
  } as const, idsDeliveredExpectedSchema);
  const generatedIdentifierSchema = TopicRouterScenarioBuilders.scenarioSchema('generated-identifier', {
    'additionalProperties': false,
    'properties': { 'pattern': stringSchema },
    'required': ['pattern'],
    'type': 'object'
  } as const, {
    'additionalProperties': false,
    'properties': { 'hasIdentifier': booleanSchema, 'unregistered': booleanSchema },
    'required': ['hasIdentifier', 'unregistered'],
    'type': 'object'
  } as const);
  const observerHooksSchema = TopicRouterScenarioBuilders.scenarioSchema('observer-hooks', {
    'additionalProperties': false,
    'properties': { 'id': stringSchema, 'matchingTopic': stringSchema, 'unmatchedTopic': stringSchema },
    'required': ['id', 'matchingTopic', 'unmatchedTopic'],
    'type': 'object'
  } as const, {
    'additionalProperties': false,
    'properties': { 'ids': stringArraySchema, 'matchLog': stringArraySchema, 'noMatchLog': stringArraySchema, 'poolExhaustedLog': stringArraySchema },
    'required': ['ids', 'matchLog', 'noMatchLog', 'poolExhaustedLog'],
    'type': 'object'
  } as const);

  export const Schema = {
    'oneOf': [matchedPublishSchema, selectedPublishSchema, candidateSourceSchema, treeCandidateSourceSchema, generatedIdentifierSchema, observerHooksSchema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': idsDeliveredExpectedNode,
      'input': topicInputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'matched-publish' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ids': stringArrayNode, 'metadata': metadataNode, 'origin': stringNode }, ['ids', 'metadata', 'origin'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': stringNode, 'metadata': metadataNode, 'origin': stringNode, 'topic': stringNode }, ['id', 'metadata', 'origin', 'topic'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'selected-publish' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': idsDeliveredExpectedNode,
      'input': topicPayloadInputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'candidate-source' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': idsDeliveredExpectedNode,
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'pattern': stringNode, 'payload': stringNode, 'topic': stringNode }, ['pattern', 'payload', 'topic'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'tree-candidate-source' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'hasIdentifier': booleanNode, 'unregistered': booleanNode }, ['hasIdentifier', 'unregistered'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'pattern': stringNode }, ['pattern'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'generated-identifier' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ids': stringArrayNode, 'matchLog': stringArrayNode, 'noMatchLog': stringArrayNode, 'poolExhaustedLog': stringArrayNode }, ['ids', 'matchLog', 'noMatchLog', 'poolExhaustedLog'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': stringNode, 'matchingTopic': stringNode, 'unmatchedTopic': stringNode }, ['id', 'matchingTopic', 'unmatchedTopic'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'observer-hooks' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
