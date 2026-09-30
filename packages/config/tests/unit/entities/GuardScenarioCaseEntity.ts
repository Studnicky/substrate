import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ScenarioJsonValueEntity } from './ScenarioJsonValueEntity.js';

const valueSchema = { '$ref': '#/$defs/ScenarioJsonValue' } as const;

/** Builds the `{ input, name, outcome, predicate }` envelope every branch shares, varying only the `predicate` const. */
class GuardScenarioBuilders {
  static scenarioSchema<const TPredicate extends string>(predicate: TPredicate) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'input': valueSchema,
        'name': { 'minLength': 1, 'type': 'string' },
        'outcome': valueSchema,
        'predicate': { 'const': predicate }
      },
      'required': ['input', 'name', 'outcome', 'predicate'],
      'type': 'object'
    } as const;
    return result;
  }

  static scenarioNode<const TPredicate extends string>(predicate: TPredicate) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'input': ScenarioJsonValueEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'outcome': ScenarioJsonValueEntity.Node,
      'predicate': SchemaNode.defineConst({}, predicate)
    }, ['input', 'name', 'outcome', 'predicate'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

const asNumberSchema = GuardScenarioBuilders.scenarioSchema('asNumber');
const asNumberNode = GuardScenarioBuilders.scenarioNode('asNumber');
const asRecordArraySchema = GuardScenarioBuilders.scenarioSchema('asRecordArray');
const asRecordArrayNode = GuardScenarioBuilders.scenarioNode('asRecordArray');
const asStringOrNullSchema = GuardScenarioBuilders.scenarioSchema('asStringOrNull');
const asStringOrNullNode = GuardScenarioBuilders.scenarioNode('asStringOrNull');
const isBooleanSchema = GuardScenarioBuilders.scenarioSchema('isBoolean');
const isBooleanNode = GuardScenarioBuilders.scenarioNode('isBoolean');
const isFunctionSchema = GuardScenarioBuilders.scenarioSchema('isFunction');
const isFunctionNode = GuardScenarioBuilders.scenarioNode('isFunction');
const isNonNegativeIntegerSchema = GuardScenarioBuilders.scenarioSchema('isNonNegativeInteger');
const isNonNegativeIntegerNode = GuardScenarioBuilders.scenarioNode('isNonNegativeInteger');
const isNumberSchema = GuardScenarioBuilders.scenarioSchema('isNumber');
const isNumberNode = GuardScenarioBuilders.scenarioNode('isNumber');
const isObjectSchema = GuardScenarioBuilders.scenarioSchema('isObject');
const isObjectNode = GuardScenarioBuilders.scenarioNode('isObject');
const isPositiveIntegerSchema = GuardScenarioBuilders.scenarioSchema('isPositiveInteger');
const isPositiveIntegerNode = GuardScenarioBuilders.scenarioNode('isPositiveInteger');
const isStringSchema = GuardScenarioBuilders.scenarioSchema('isString');
const isStringNode = GuardScenarioBuilders.scenarioNode('isString');

/** The ten `Predicates`-named scenario kinds `guard.loop.spec.ts` exercises, discriminated by the `predicate` const field. */
export namespace GuardScenarioCaseEntity {
  export const Schema = {
    '$defs': ScenarioJsonValueEntity.Schema.$defs,
    'oneOf': [
      asNumberSchema, asRecordArraySchema, asStringOrNullSchema, isBooleanSchema, isFunctionSchema,
      isNonNegativeIntegerSchema, isNumberSchema, isObjectSchema, isPositiveIntegerSchema, isStringSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({ '$defs': ScenarioJsonValueEntity.Schema.$defs } as const, [
    asNumberNode, asRecordArrayNode, asStringOrNullNode, isBooleanNode, isFunctionNode,
    isNonNegativeIntegerNode, isNumberNode, isObjectNode, isPositiveIntegerNode, isStringNode
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
