import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ClampEventEntity } from '../../../src/entities/ClampEventEntity.js';
import { ClampRuleEntity } from '../../../src/entities/ClampRuleEntity.js';
import { ScenarioJsonValueEntity } from './ScenarioJsonValueEntity.js';

const configSchema = { 'additionalProperties': { '$ref': '#/$defs/ScenarioJsonValue' }, 'type': 'object' } as const;
const configNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ScenarioJsonValueEntity.Node, 'patternProperties': {} });
const rulesSchema = { 'additionalProperties': ClampRuleEntity.Schema, 'type': 'object' } as const;
const rulesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ClampRuleEntity.Node, 'patternProperties': {} });
const inputSchema = { 'additionalProperties': false, 'properties': { 'config': configSchema, 'rules': rulesSchema }, 'required': ['config', 'rules'], 'type': 'object' } as const;
const inputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'config': configNode, 'rules': rulesNode }, ['config', 'rules'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const numberSchema = { 'type': 'number' } as const;
const numberNode = SchemaNode.defineNumber(numberSchema);
const booleanSchema = { 'type': 'boolean' } as const;
const booleanNode = SchemaNode.defineBoolean(booleanSchema);
const stringArraySchema = { 'items': { 'type': 'string' }, 'type': 'array' } as const;
const stringArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined);

/** Builds the `{ description, expected, input, name, shape }` envelope every branch shares, varying only `shape` and the `expected` payload. */
class ClampedConfigScenarioBuilders {
  static scenarioSchema<const TShape extends string, TExpectedSchema extends object>(shape: TShape, expectedSchema: TExpectedSchema) {
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

  static scenarioNode<const TShape extends string, TExpectedNode extends SchemaNodeInterface<unknown, unknown>>(shape: TShape, expectedNode: TExpectedNode) {
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

const resultExpectedSchema = { 'additionalProperties': false, 'properties': { 'result': configSchema }, 'required': ['result'], 'type': 'object' } as const;
const resultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': configNode }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const eventCountExpectedSchema = { 'additionalProperties': false, 'properties': { 'eventCount': numberSchema }, 'required': ['eventCount'], 'type': 'object' } as const;
const eventCountExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'eventCount': numberNode }, ['eventCount'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const eventCountResultExpectedSchema = { 'additionalProperties': false, 'properties': { 'eventCount': numberSchema, 'result': configSchema }, 'required': ['eventCount', 'result'], 'type': 'object' } as const;
const eventCountResultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'eventCount': numberNode, 'result': configNode }, ['eventCount', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const eventResultExpectedSchema = { 'additionalProperties': false, 'properties': { 'event': ClampEventEntity.Schema, 'result': configSchema }, 'required': ['event', 'result'], 'type': 'object' } as const;
const eventResultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': ClampEventEntity.Node, 'result': configNode }, ['event', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const eventFieldsResultExpectedSchema = { 'additionalProperties': false, 'properties': { 'eventFields': stringArraySchema, 'result': configSchema }, 'required': ['eventFields', 'result'], 'type': 'object' } as const;
const eventFieldsResultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'eventFields': stringArrayNode, 'result': configNode }, ['eventFields', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const inputResultExpectedSchema = { 'additionalProperties': false, 'properties': { 'input': configSchema, 'result': configSchema }, 'required': ['input', 'result'], 'type': 'object' } as const;
const inputResultExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'input': configNode, 'result': configNode }, ['input', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const sameReferenceExpectedSchema = { 'additionalProperties': false, 'properties': { 'input': configSchema, 'result': configSchema, 'sameReference': booleanSchema }, 'required': ['input', 'result', 'sameReference'], 'type': 'object' } as const;
const sameReferenceExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'input': configNode, 'result': configNode, 'sameReference': booleanNode }, ['input', 'result', 'sameReference'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const asyncExpectedSchema = { 'additionalProperties': false, 'properties': { 'hookInvoked': booleanSchema, 'rejectionCount': numberSchema, 'result': configSchema }, 'required': ['hookInvoked', 'rejectionCount', 'result'], 'type': 'object' } as const;
const asyncExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookInvoked': booleanNode, 'rejectionCount': numberNode, 'result': configNode }, ['hookInvoked', 'rejectionCount', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const absentFieldUntouchedSchema = ClampedConfigScenarioBuilders.scenarioSchema('absent-field-untouched', resultExpectedSchema);
const absentFieldUntouchedNode = ClampedConfigScenarioBuilders.scenarioNode('absent-field-untouched', resultExpectedNode);
const asyncThrowingHookIsContainedSchema = ClampedConfigScenarioBuilders.scenarioSchema('async-throwing-hook-is-contained', asyncExpectedSchema);
const asyncThrowingHookIsContainedNode = ClampedConfigScenarioBuilders.scenarioNode('async-throwing-hook-is-contained', asyncExpectedNode);
const clampAboveMaximumSchema = ClampedConfigScenarioBuilders.scenarioSchema('clamp-above-max', resultExpectedSchema);
const clampAboveMaximumNode = ClampedConfigScenarioBuilders.scenarioNode('clamp-above-max', resultExpectedNode);
const clampBelowMinimumSchema = ClampedConfigScenarioBuilders.scenarioSchema('clamp-below-min', resultExpectedSchema);
const clampBelowMinimumNode = ClampedConfigScenarioBuilders.scenarioNode('clamp-below-min', resultExpectedNode);
const defaultHookNoopSchema = ClampedConfigScenarioBuilders.scenarioSchema('default-hook-noop', resultExpectedSchema);
const defaultHookNoopNode = ClampedConfigScenarioBuilders.scenarioNode('default-hook-noop', resultExpectedNode);
const inRangeUntouchedSchema = ClampedConfigScenarioBuilders.scenarioSchema('in-range-untouched', resultExpectedSchema);
const inRangeUntouchedNode = ClampedConfigScenarioBuilders.scenarioNode('in-range-untouched', resultExpectedNode);
const nanFieldUntouchedNoHookSchema = ClampedConfigScenarioBuilders.scenarioSchema('nan-field-untouched-no-hook', eventCountExpectedSchema);
const nanFieldUntouchedNoHookNode = ClampedConfigScenarioBuilders.scenarioNode('nan-field-untouched-no-hook', eventCountExpectedNode);
const nonNumericFieldUntouchedSchema = ClampedConfigScenarioBuilders.scenarioSchema('non-numeric-field-untouched', resultExpectedSchema);
const nonNumericFieldUntouchedNode = ClampedConfigScenarioBuilders.scenarioNode('non-numeric-field-untouched', resultExpectedNode);
const onClampFiresSchema = ClampedConfigScenarioBuilders.scenarioSchema('on-clamp-fires', eventResultExpectedSchema);
const onClampFiresNode = ClampedConfigScenarioBuilders.scenarioNode('on-clamp-fires', eventResultExpectedNode);
const onClampMultiFieldSchema = ClampedConfigScenarioBuilders.scenarioSchema('on-clamp-multi-field', eventFieldsResultExpectedSchema);
const onClampMultiFieldNode = ClampedConfigScenarioBuilders.scenarioNode('on-clamp-multi-field', eventFieldsResultExpectedNode);
const onClampSkippedInRangeSchema = ClampedConfigScenarioBuilders.scenarioSchema('on-clamp-skipped-in-range', eventCountResultExpectedSchema);
const onClampSkippedInRangeNode = ClampedConfigScenarioBuilders.scenarioNode('on-clamp-skipped-in-range', eventCountResultExpectedNode);
const returnsNewObjectSchema = ClampedConfigScenarioBuilders.scenarioSchema('returns-new-object', sameReferenceExpectedSchema);
const returnsNewObjectNode = ClampedConfigScenarioBuilders.scenarioNode('returns-new-object', sameReferenceExpectedNode);
const throwingHookPreservesInputSchema = ClampedConfigScenarioBuilders.scenarioSchema('throwing-hook-preserves-input', inputResultExpectedSchema);
const throwingHookPreservesInputNode = ClampedConfigScenarioBuilders.scenarioNode('throwing-hook-preserves-input', inputResultExpectedNode);
const throwingHookPreservesResultSchema = ClampedConfigScenarioBuilders.scenarioSchema('throwing-hook-preserves-result', resultExpectedSchema);
const throwingHookPreservesResultNode = ClampedConfigScenarioBuilders.scenarioNode('throwing-hook-preserves-result', resultExpectedNode);
const unruledFieldUntouchedSchema = ClampedConfigScenarioBuilders.scenarioSchema('unruled-field-untouched', resultExpectedSchema);
const unruledFieldUntouchedNode = ClampedConfigScenarioBuilders.scenarioNode('unruled-field-untouched', resultExpectedNode);

/** The 15 scenario shapes `clampedConfig.loop.spec.ts` exercises, discriminated by the `shape` const field. */
export namespace ClampedConfigScenarioCaseEntity {
  export const Schema = {
    '$defs': ScenarioJsonValueEntity.Schema.$defs,
    'oneOf': [
      absentFieldUntouchedSchema, asyncThrowingHookIsContainedSchema, clampAboveMaximumSchema, clampBelowMinimumSchema,
      defaultHookNoopSchema, inRangeUntouchedSchema, nanFieldUntouchedNoHookSchema, nonNumericFieldUntouchedSchema,
      onClampFiresSchema, onClampMultiFieldSchema, onClampSkippedInRangeSchema, returnsNewObjectSchema,
      throwingHookPreservesInputSchema, throwingHookPreservesResultSchema, unruledFieldUntouchedSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({ '$defs': ScenarioJsonValueEntity.Schema.$defs } as const, [
    absentFieldUntouchedNode, asyncThrowingHookIsContainedNode, clampAboveMaximumNode, clampBelowMinimumNode,
    defaultHookNoopNode, inRangeUntouchedNode, nanFieldUntouchedNoHookNode, nonNumericFieldUntouchedNode,
    onClampFiresNode, onClampMultiFieldNode, onClampSkippedInRangeNode, returnsNewObjectNode,
    throwingHookPreservesInputNode, throwingHookPreservesResultNode, unruledFieldUntouchedNode
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
