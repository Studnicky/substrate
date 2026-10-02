import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`: the shared `{ description, expected, input, name, shape }` envelope around a shape-specific `expected`. */
class JsonBehaviorScenarioCaseEntityBranches {
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

/** Scenario case shape for json-behavior tests. */
export namespace JsonBehaviorScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-top-level', { 'additionalProperties': false, 'properties': { 'next': {} }, 'required': ['next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-untouched', { 'additionalProperties': false, 'properties': { 'base': {} }, 'required': ['base'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-sibling-sharing', { 'additionalProperties': false, 'properties': { 'next': {} }, 'required': ['next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-array-push', { 'additionalProperties': false, 'properties': { 'base': {}, 'next': {} }, 'required': ['base', 'next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-array-splice', { 'additionalProperties': false, 'properties': { 'next': {} }, 'required': ['next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-array-delete', { 'additionalProperties': false, 'properties': { 'length': { 'type': 'number' }, 'next': {} }, 'required': ['length', 'next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-array-index', { 'additionalProperties': false, 'properties': { 'next': {} }, 'required': ['next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-noop-base', { 'additionalProperties': false, 'properties': { 'sameReference': { 'type': 'boolean' } }, 'required': ['sameReference'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-noop-read', { 'additionalProperties': false, 'properties': { 'sameReference': { 'type': 'boolean' } }, 'required': ['sameReference'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-proxy-memo', { 'additionalProperties': false, 'properties': { 'memoized': { 'type': 'boolean' } }, 'required': ['memoized'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-pass-through', { 'additionalProperties': false, 'properties': { 'createdAtPassthrough': { 'type': 'boolean' }, 'label': { 'type': 'string' }, 'widgetPassthrough': { 'type': 'boolean' } }, 'required': ['createdAtPassthrough', 'label', 'widgetPassthrough'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-deep-sharing', { 'additionalProperties': false, 'properties': { 'next': {} }, 'required': ['next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-delete', { 'additionalProperties': false, 'properties': { 'next': {} }, 'required': ['next'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-patch-roundtrip', { 'additionalProperties': false, 'properties': { 'roundTrips': { 'type': 'boolean' } }, 'required': ['roundTrips'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-patch-remove', { 'additionalProperties': false, 'properties': { 'roundTrips': { 'type': 'boolean' } }, 'required': ['roundTrips'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-patch-add', { 'additionalProperties': false, 'properties': { 'roundTrips': { 'type': 'boolean' } }, 'required': ['roundTrips'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-patch-empty', { 'additionalProperties': false, 'properties': { 'patch': {} }, 'required': ['patch'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-proxy-reflection', { 'additionalProperties': false, 'properties': { 'arrayLengthConfigurable': { 'type': 'boolean' }, 'hasNested': { 'type': 'boolean' }, 'keys': {}, 'nestedDescriptorConfigurable': { 'type': 'boolean' }, 'symbolPassthrough': { 'type': 'boolean' } }, 'required': ['arrayLengthConfigurable', 'hasNested', 'keys', 'nestedDescriptorConfigurable', 'symbolPassthrough'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-patch-invalid-value', { 'additionalProperties': false, 'properties': { 'error': { 'type': 'string' } }, 'required': ['error'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('draft-patch-escaped-keys', { 'additionalProperties': false, 'properties': { 'patch': {} }, 'required': ['patch'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-add', { 'additionalProperties': false, 'properties': { 'nested': {}, 'target': {} }, 'required': ['nested', 'target'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-create-errors', { 'additionalProperties': false, 'properties': { 'error': { 'type': 'string' } }, 'required': ['error'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-replace', { 'additionalProperties': false, 'properties': { 'replaced': { 'type': 'number' } }, 'required': ['replaced'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-remove', { 'additionalProperties': false, 'properties': { 'array': {}, 'remaining': {} }, 'required': ['array', 'remaining'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-copy', { 'additionalProperties': false, 'properties': { 'target': {} }, 'required': ['target'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-move', { 'additionalProperties': false, 'properties': { 'target': {} }, 'required': ['target'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-test', { 'additionalProperties': false, 'properties': { 'match': { 'type': 'boolean' }, 'mismatch': { 'type': 'boolean' } }, 'required': ['match', 'mismatch'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-multiple', { 'additionalProperties': false, 'properties': { 'target': {} }, 'required': ['target'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-empty', { 'additionalProperties': false, 'properties': { 'empty': { 'type': 'boolean' }, 'nonEmpty': { 'type': 'boolean' } }, 'required': ['empty', 'nonEmpty'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-to-string', { 'additionalProperties': false, 'properties': { 'contains': {} }, 'required': ['contains'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-operations', { 'additionalProperties': false, 'properties': { 'isolated': { 'type': 'boolean' } }, 'required': ['isolated'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-path-parsing', { 'additionalProperties': false, 'properties': { 'escaped': {}, 'nested': {} }, 'required': ['escaped', 'nested'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-subclass', { 'additionalProperties': false, 'properties': { 'isStrict': { 'type': 'boolean' } }, 'required': ['isStrict'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-root-and-errors', { 'additionalProperties': false, 'properties': { 'rootNoop': {} }, 'required': ['rootNoop'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-array-remove-numeric', { 'additionalProperties': false, 'properties': { 'target': {} }, 'required': ['target'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('patch-to-string-all-ops', { 'additionalProperties': false, 'properties': { 'contains': {} }, 'required': ['contains'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('path-access', { 'additionalProperties': false, 'properties': { 'access': {} }, 'required': ['access'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('path-get', { 'additionalProperties': false, 'properties': { 'safe': { 'type': 'boolean' }, 'wildcard': { 'type': 'boolean' } }, 'required': ['safe', 'wildcard'], 'type': 'object' } as const),
      JsonBehaviorScenarioCaseEntityBranches.scenarioSchema('path-subclass', { 'additionalProperties': false, 'properties': { 'openPath': { 'type': 'boolean' } }, 'required': ['openPath'], 'type': 'object' } as const)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-top-level', SchemaNode.defineObject({ 'type': 'object' } as const, { 'next': SchemaNode.defineUnknown({} as const) }, ['next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-untouched', SchemaNode.defineObject({ 'type': 'object' } as const, { 'base': SchemaNode.defineUnknown({} as const) }, ['base'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-sibling-sharing', SchemaNode.defineObject({ 'type': 'object' } as const, { 'next': SchemaNode.defineUnknown({} as const) }, ['next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-array-push', SchemaNode.defineObject({ 'type': 'object' } as const, { 'base': SchemaNode.defineUnknown({} as const), 'next': SchemaNode.defineUnknown({} as const) }, ['base', 'next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-array-splice', SchemaNode.defineObject({ 'type': 'object' } as const, { 'next': SchemaNode.defineUnknown({} as const) }, ['next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-array-delete', SchemaNode.defineObject({ 'type': 'object' } as const, { 'length': SchemaNode.defineNumber({ 'type': 'number' } as const), 'next': SchemaNode.defineUnknown({} as const) }, ['length', 'next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-array-index', SchemaNode.defineObject({ 'type': 'object' } as const, { 'next': SchemaNode.defineUnknown({} as const) }, ['next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-noop-base', SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameReference': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameReference'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-noop-read', SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameReference': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameReference'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-proxy-memo', SchemaNode.defineObject({ 'type': 'object' } as const, { 'memoized': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['memoized'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-pass-through', SchemaNode.defineObject({ 'type': 'object' } as const, { 'createdAtPassthrough': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'label': SchemaNode.defineString({ 'type': 'string' } as const), 'widgetPassthrough': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['createdAtPassthrough', 'label', 'widgetPassthrough'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-deep-sharing', SchemaNode.defineObject({ 'type': 'object' } as const, { 'next': SchemaNode.defineUnknown({} as const) }, ['next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-delete', SchemaNode.defineObject({ 'type': 'object' } as const, { 'next': SchemaNode.defineUnknown({} as const) }, ['next'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-patch-roundtrip', SchemaNode.defineObject({ 'type': 'object' } as const, { 'roundTrips': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['roundTrips'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-patch-remove', SchemaNode.defineObject({ 'type': 'object' } as const, { 'roundTrips': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['roundTrips'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-patch-add', SchemaNode.defineObject({ 'type': 'object' } as const, { 'roundTrips': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['roundTrips'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-patch-empty', SchemaNode.defineObject({ 'type': 'object' } as const, { 'patch': SchemaNode.defineUnknown({} as const) }, ['patch'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-proxy-reflection', SchemaNode.defineObject({ 'type': 'object' } as const, { 'arrayLengthConfigurable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'hasNested': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'keys': SchemaNode.defineUnknown({} as const), 'nestedDescriptorConfigurable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'symbolPassthrough': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['arrayLengthConfigurable', 'hasNested', 'keys', 'nestedDescriptorConfigurable', 'symbolPassthrough'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-patch-invalid-value', SchemaNode.defineObject({ 'type': 'object' } as const, { 'error': SchemaNode.defineString({ 'type': 'string' } as const) }, ['error'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('draft-patch-escaped-keys', SchemaNode.defineObject({ 'type': 'object' } as const, { 'patch': SchemaNode.defineUnknown({} as const) }, ['patch'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-add', SchemaNode.defineObject({ 'type': 'object' } as const, { 'nested': SchemaNode.defineUnknown({} as const), 'target': SchemaNode.defineUnknown({} as const) }, ['nested', 'target'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-create-errors', SchemaNode.defineObject({ 'type': 'object' } as const, { 'error': SchemaNode.defineString({ 'type': 'string' } as const) }, ['error'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-replace', SchemaNode.defineObject({ 'type': 'object' } as const, { 'replaced': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['replaced'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-remove', SchemaNode.defineObject({ 'type': 'object' } as const, { 'array': SchemaNode.defineUnknown({} as const), 'remaining': SchemaNode.defineUnknown({} as const) }, ['array', 'remaining'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-copy', SchemaNode.defineObject({ 'type': 'object' } as const, { 'target': SchemaNode.defineUnknown({} as const) }, ['target'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-move', SchemaNode.defineObject({ 'type': 'object' } as const, { 'target': SchemaNode.defineUnknown({} as const) }, ['target'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-test', SchemaNode.defineObject({ 'type': 'object' } as const, { 'match': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'mismatch': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['match', 'mismatch'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-multiple', SchemaNode.defineObject({ 'type': 'object' } as const, { 'target': SchemaNode.defineUnknown({} as const) }, ['target'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-empty', SchemaNode.defineObject({ 'type': 'object' } as const, { 'empty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'nonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['empty', 'nonEmpty'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-to-string', SchemaNode.defineObject({ 'type': 'object' } as const, { 'contains': SchemaNode.defineUnknown({} as const) }, ['contains'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-operations', SchemaNode.defineObject({ 'type': 'object' } as const, { 'isolated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['isolated'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-path-parsing', SchemaNode.defineObject({ 'type': 'object' } as const, { 'escaped': SchemaNode.defineUnknown({} as const), 'nested': SchemaNode.defineUnknown({} as const) }, ['escaped', 'nested'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-subclass', SchemaNode.defineObject({ 'type': 'object' } as const, { 'isStrict': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['isStrict'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-root-and-errors', SchemaNode.defineObject({ 'type': 'object' } as const, { 'rootNoop': SchemaNode.defineUnknown({} as const) }, ['rootNoop'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-array-remove-numeric', SchemaNode.defineObject({ 'type': 'object' } as const, { 'target': SchemaNode.defineUnknown({} as const) }, ['target'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('patch-to-string-all-ops', SchemaNode.defineObject({ 'type': 'object' } as const, { 'contains': SchemaNode.defineUnknown({} as const) }, ['contains'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('path-access', SchemaNode.defineObject({ 'type': 'object' } as const, { 'access': SchemaNode.defineUnknown({} as const) }, ['access'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('path-get', SchemaNode.defineObject({ 'type': 'object' } as const, { 'safe': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'wildcard': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['safe', 'wildcard'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    JsonBehaviorScenarioCaseEntityBranches.scenarioNode('path-subclass', SchemaNode.defineObject({ 'type': 'object' } as const, { 'openPath': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['openPath'] as const, { 'additionalProperties': false, 'patternProperties': {} }))
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
