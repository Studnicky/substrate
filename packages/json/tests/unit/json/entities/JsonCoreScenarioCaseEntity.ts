import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`: the shared `{ description, expected, input, name, shape }` envelope around a shape-specific `expected`. */
class JsonCoreScenarioCaseEntityBranches {
  static scenarioSchema<
    const TShape extends string,
    TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': expectedSchema,
        'input': {
          'additionalProperties': false,
          'properties': { 'json': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } },
          'required': ['json'],
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

  static scenarioNode<
    const TShape extends string,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'json': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }) },
        ['json'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** Scenario case shape for json-core tests. */
export namespace JsonCoreScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-number', { 'additionalProperties': false, 'properties': { 'cloned': { 'type': 'number' } }, 'required': ['cloned'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-string', { 'additionalProperties': false, 'properties': { 'cloned': { 'type': 'string' } }, 'required': ['cloned'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-null', { 'additionalProperties': false, 'properties': { 'cloned': {} }, 'required': ['cloned'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-array', { 'additionalProperties': false, 'properties': { 'cloned': {}, 'distinct': { 'type': 'boolean' } }, 'required': ['cloned', 'distinct'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-nested-object', { 'additionalProperties': false, 'properties': { 'cloned': {}, 'distinct': { 'type': 'boolean' } }, 'required': ['cloned', 'distinct'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-map', { 'additionalProperties': false, 'properties': { 'distinct': { 'type': 'boolean' }, 'size': { 'type': 'number' } }, 'required': ['distinct', 'size'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-set', { 'additionalProperties': false, 'properties': { 'distinct': { 'type': 'boolean' }, 'has': {} }, 'required': ['distinct', 'has'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-date', { 'additionalProperties': false, 'properties': { 'cloned': { 'type': 'string' } }, 'required': ['cloned'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-deep-isolation', { 'additionalProperties': false, 'properties': { 'originalUnchanged': { 'type': 'boolean' } }, 'required': ['originalUnchanged'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-shallow', { 'additionalProperties': false, 'properties': { 'nestedShared': { 'type': 'boolean' } }, 'required': ['nestedShared'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-subclass-root', { 'additionalProperties': false, 'properties': { 'tagged': { 'type': 'boolean' } }, 'required': ['tagged'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-subclass-nested', { 'additionalProperties': false, 'properties': { 'nestedTagged': { 'type': 'boolean' }, 'tagged': { 'type': 'boolean' } }, 'required': ['nestedTagged', 'tagged'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('clone-subclass-base', { 'additionalProperties': false, 'properties': { 'tagged': { 'type': 'boolean' } }, 'required': ['tagged'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-deepequal-true', { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-deepequal-false', { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-deepequal-special', { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-plain-object', { 'additionalProperties': false, 'properties': { 'array': { 'type': 'boolean' }, 'date': { 'type': 'boolean' }, 'plain': { 'type': 'boolean' } }, 'required': ['array', 'date', 'plain'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-record', { 'additionalProperties': false, 'properties': { 'array': { 'type': 'boolean' }, 'map': { 'type': 'boolean' }, 'null': { 'type': 'boolean' }, 'object': { 'type': 'boolean' } }, 'required': ['array', 'map', 'null', 'object'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-cycle', { 'additionalProperties': false, 'properties': { 'acyclic': { 'type': 'boolean' }, 'arrayCycle': { 'type': 'boolean' }, 'objectCycle': { 'type': 'boolean' } }, 'required': ['acyclic', 'arrayCycle', 'objectCycle'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('data-deepequal-negative-branches', { 'additionalProperties': false, 'properties': { 'allNegativeChecksFail': { 'type': 'boolean' } }, 'required': ['allNegativeChecksFail'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-flat', { 'additionalProperties': false, 'properties': { 'frozen': { 'type': 'boolean' } }, 'required': ['frozen'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-nested', { 'additionalProperties': false, 'properties': { 'frozen': { 'type': 'boolean' }, 'nestedFrozen': { 'type': 'boolean' } }, 'required': ['frozen', 'nestedFrozen'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-reference', { 'additionalProperties': false, 'properties': { 'sameReference': { 'type': 'boolean' } }, 'required': ['sameReference'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-cycle', { 'additionalProperties': false, 'properties': { 'noThrow': { 'type': 'boolean' } }, 'required': ['noThrow'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-primitives', { 'additionalProperties': false, 'properties': { 'passthrough': { 'type': 'boolean' } }, 'required': ['passthrough'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-map-set', { 'additionalProperties': false, 'properties': { 'mutationBlocked': { 'type': 'boolean' } }, 'required': ['mutationBlocked'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-map-values', { 'additionalProperties': false, 'properties': { 'nestedFrozen': { 'type': 'boolean' } }, 'required': ['nestedFrozen'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-set-values', { 'additionalProperties': false, 'properties': { 'nestedFrozen': { 'type': 'boolean' }, 'size': { 'type': 'number' } }, 'required': ['nestedFrozen', 'size'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('frozen-subclass-skip', { 'additionalProperties': false, 'properties': { 'childFrozen': { 'type': 'boolean' }, 'rootFrozen': { 'type': 'boolean' } }, 'required': ['childFrozen', 'rootFrozen'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('merge-primitives', { 'additionalProperties': false, 'properties': { 'merged': { 'type': 'number' } }, 'required': ['merged'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('merge-isolation', { 'additionalProperties': false, 'properties': { 'isolated': { 'type': 'boolean' } }, 'required': ['isolated'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('merge-hidden-class', { 'additionalProperties': false, 'properties': { 'keyOrder': {}, 'stableShape': { 'type': 'boolean' } }, 'required': ['keyOrder', 'stableShape'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('sort-functions', { 'additionalProperties': false, 'properties': { 'ascending': {}, 'descending': {} }, 'required': ['ascending', 'descending'], 'type': 'object' } as const),
      JsonCoreScenarioCaseEntityBranches.scenarioSchema('entities-core', { 'additionalProperties': false, 'properties': { 'ids': {} }, 'required': ['ids'], 'type': 'object' } as const)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-number', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cloned': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['cloned'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-string', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cloned': SchemaNode.defineString({ 'type': 'string' } as const) }, ['cloned'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-null', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cloned': SchemaNode.defineUnknown({} as const) }, ['cloned'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-array', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cloned': SchemaNode.defineUnknown({} as const), 'distinct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['cloned', 'distinct'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-nested-object', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cloned': SchemaNode.defineUnknown({} as const), 'distinct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['cloned', 'distinct'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-map', SchemaNode.defineObject({ 'type': 'object' } as const, { 'distinct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'size': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['distinct', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-set', SchemaNode.defineObject({ 'type': 'object' } as const, { 'distinct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'has': SchemaNode.defineUnknown({} as const) }, ['distinct', 'has'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-date', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cloned': SchemaNode.defineString({ 'type': 'string' } as const) }, ['cloned'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-deep-isolation', SchemaNode.defineObject({ 'type': 'object' } as const, { 'originalUnchanged': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['originalUnchanged'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-shallow', SchemaNode.defineObject({ 'type': 'object' } as const, { 'nestedShared': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['nestedShared'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-subclass-root', SchemaNode.defineObject({ 'type': 'object' } as const, { 'tagged': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['tagged'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-subclass-nested', SchemaNode.defineObject({ 'type': 'object' } as const, { 'nestedTagged': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'tagged': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['nestedTagged', 'tagged'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('clone-subclass-base', SchemaNode.defineObject({ 'type': 'object' } as const, { 'tagged': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['tagged'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-deepequal-true', SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-deepequal-false', SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-deepequal-special', SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-plain-object', SchemaNode.defineObject({ 'type': 'object' } as const, { 'array': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'date': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'plain': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['array', 'date', 'plain'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-record', SchemaNode.defineObject({ 'type': 'object' } as const, { 'array': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'map': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'null': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'object': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['array', 'map', 'null', 'object'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-cycle', SchemaNode.defineObject({ 'type': 'object' } as const, { 'acyclic': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'arrayCycle': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'objectCycle': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['acyclic', 'arrayCycle', 'objectCycle'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('data-deepequal-negative-branches', SchemaNode.defineObject({ 'type': 'object' } as const, { 'allNegativeChecksFail': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['allNegativeChecksFail'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-flat', SchemaNode.defineObject({ 'type': 'object' } as const, { 'frozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['frozen'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-nested', SchemaNode.defineObject({ 'type': 'object' } as const, { 'frozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'nestedFrozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['frozen', 'nestedFrozen'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-reference', SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameReference': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameReference'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-cycle', SchemaNode.defineObject({ 'type': 'object' } as const, { 'noThrow': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['noThrow'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-primitives', SchemaNode.defineObject({ 'type': 'object' } as const, { 'passthrough': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['passthrough'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-map-set', SchemaNode.defineObject({ 'type': 'object' } as const, { 'mutationBlocked': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['mutationBlocked'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-map-values', SchemaNode.defineObject({ 'type': 'object' } as const, { 'nestedFrozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['nestedFrozen'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-set-values', SchemaNode.defineObject({ 'type': 'object' } as const, { 'nestedFrozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'size': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['nestedFrozen', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('frozen-subclass-skip', SchemaNode.defineObject({ 'type': 'object' } as const, { 'childFrozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'rootFrozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['childFrozen', 'rootFrozen'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('merge-primitives', SchemaNode.defineObject({ 'type': 'object' } as const, { 'merged': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['merged'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('merge-isolation', SchemaNode.defineObject({ 'type': 'object' } as const, { 'isolated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['isolated'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('merge-hidden-class', SchemaNode.defineObject({ 'type': 'object' } as const, { 'keyOrder': SchemaNode.defineUnknown({} as const), 'stableShape': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['keyOrder', 'stableShape'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('sort-functions', SchemaNode.defineObject({ 'type': 'object' } as const, { 'ascending': SchemaNode.defineUnknown({} as const), 'descending': SchemaNode.defineUnknown({} as const) }, ['ascending', 'descending'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonCoreScenarioCaseEntityBranches.scenarioNode('entities-core', SchemaNode.defineObject({ 'type': 'object' } as const, { 'ids': SchemaNode.defineUnknown({} as const) }, ['ids'] as const, { 'additionalProperties': false, 'patternProperties': {} }))
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
