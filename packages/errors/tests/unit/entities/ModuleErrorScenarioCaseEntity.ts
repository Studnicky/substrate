import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class ModuleErrorScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
        'input': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
        'name': { 'minLength': 1, 'type': 'string' },
        'scenario': { 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'scenario': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * The scenario case shape `module-error.loop.spec.ts` exercises across 56 ModuleError
 * behaviors. Most runners are fully self-contained (hardcoded literals, not fixture-driven);
 * `input`/`expected` stay open dictionaries here since their shape varies enormously across
 * shapes and only a handful of runners actually read specific fields off them — those runners
 * narrow what they need themselves instead of asserting the whole bag's shape.
 */
export namespace ModuleErrorScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ModuleErrorScenarioCaseBuilders.branchSchema('cause-builds-chain'),
      ModuleErrorScenarioCaseBuilders.branchSchema('cause-handles-undefined'),
      ModuleErrorScenarioCaseBuilders.branchSchema('cause-stores-single'),
      ModuleErrorScenarioCaseBuilders.branchSchema('chain-circular'),
      ModuleErrorScenarioCaseBuilders.branchSchema('chain-deep'),
      ModuleErrorScenarioCaseBuilders.branchSchema('chain-nested'),
      ModuleErrorScenarioCaseBuilders.branchSchema('chain-single'),
      ModuleErrorScenarioCaseBuilders.branchSchema('constructor-defaults-omitted-options'),
      ModuleErrorScenarioCaseBuilders.branchSchema('context-detaches-projections'),
      ModuleErrorScenarioCaseBuilders.branchSchema('context-empty-object'),
      ModuleErrorScenarioCaseBuilders.branchSchema('context-handles-undefined'),
      ModuleErrorScenarioCaseBuilders.branchSchema('context-null-prototype'),
      ModuleErrorScenarioCaseBuilders.branchSchema('context-preserves-collaborator-instance'),
      ModuleErrorScenarioCaseBuilders.branchSchema('context-stores-arbitrary-data'),
      ModuleErrorScenarioCaseBuilders.branchSchema('factory-merge-user-options'),
      ModuleErrorScenarioCaseBuilders.branchSchema('factory-reject-empty-code'),
      ModuleErrorScenarioCaseBuilders.branchSchema('factory-reject-empty-message'),
      ModuleErrorScenarioCaseBuilders.branchSchema('factory-reject-invalid-scenario'),
      ModuleErrorScenarioCaseBuilders.branchSchema('factory-scenario-defaults'),
      ModuleErrorScenarioCaseBuilders.branchSchema('find-cause-circular'),
      ModuleErrorScenarioCaseBuilders.branchSchema('find-cause-first-match'),
      ModuleErrorScenarioCaseBuilders.branchSchema('find-cause-match'),
      ModuleErrorScenarioCaseBuilders.branchSchema('find-cause-missing'),
      ModuleErrorScenarioCaseBuilders.branchSchema('find-cause-subclass'),
      ModuleErrorScenarioCaseBuilders.branchSchema('has-cause-circular'),
      ModuleErrorScenarioCaseBuilders.branchSchema('has-cause-deep'),
      ModuleErrorScenarioCaseBuilders.branchSchema('has-cause-empty'),
      ModuleErrorScenarioCaseBuilders.branchSchema('has-cause-false'),
      ModuleErrorScenarioCaseBuilders.branchSchema('has-cause-true'),
      ModuleErrorScenarioCaseBuilders.branchSchema('http-allows-status-override'),
      ModuleErrorScenarioCaseBuilders.branchSchema('http-uses-scenario-code'),
      ModuleErrorScenarioCaseBuilders.branchSchema('instanceof-error'),
      ModuleErrorScenarioCaseBuilders.branchSchema('instanceof-module-error'),
      ModuleErrorScenarioCaseBuilders.branchSchema('instanceof-subclass'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-basic'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-deep-chain'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-depth-sentinel'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-excludes-undefined'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-module-cause'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-native-cause'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-optional-context'),
      ModuleErrorScenarioCaseBuilders.branchSchema('json-safe'),
      ModuleErrorScenarioCaseBuilders.branchSchema('retryable-permanent'),
      ModuleErrorScenarioCaseBuilders.branchSchema('retryable-transient'),
      ModuleErrorScenarioCaseBuilders.branchSchema('scenario-defaults'),
      ModuleErrorScenarioCaseBuilders.branchSchema('scenario-retryable-overrides'),
      ModuleErrorScenarioCaseBuilders.branchSchema('stack-trace'),
      ModuleErrorScenarioCaseBuilders.branchSchema('stack-trace-disabled'),
      ModuleErrorScenarioCaseBuilders.branchSchema('subclass-custom'),
      ModuleErrorScenarioCaseBuilders.branchSchema('subclass-overrides-defaults'),
      ModuleErrorScenarioCaseBuilders.branchSchema('subclass-serialization-name')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ModuleErrorScenarioCaseBuilders.branchNode('cause-builds-chain'),
    ModuleErrorScenarioCaseBuilders.branchNode('cause-handles-undefined'),
    ModuleErrorScenarioCaseBuilders.branchNode('cause-stores-single'),
    ModuleErrorScenarioCaseBuilders.branchNode('chain-circular'),
    ModuleErrorScenarioCaseBuilders.branchNode('chain-deep'),
    ModuleErrorScenarioCaseBuilders.branchNode('chain-nested'),
    ModuleErrorScenarioCaseBuilders.branchNode('chain-single'),
    ModuleErrorScenarioCaseBuilders.branchNode('constructor-defaults-omitted-options'),
    ModuleErrorScenarioCaseBuilders.branchNode('context-detaches-projections'),
    ModuleErrorScenarioCaseBuilders.branchNode('context-empty-object'),
    ModuleErrorScenarioCaseBuilders.branchNode('context-handles-undefined'),
    ModuleErrorScenarioCaseBuilders.branchNode('context-null-prototype'),
    ModuleErrorScenarioCaseBuilders.branchNode('context-preserves-collaborator-instance'),
    ModuleErrorScenarioCaseBuilders.branchNode('context-stores-arbitrary-data'),
    ModuleErrorScenarioCaseBuilders.branchNode('factory-merge-user-options'),
    ModuleErrorScenarioCaseBuilders.branchNode('factory-reject-empty-code'),
    ModuleErrorScenarioCaseBuilders.branchNode('factory-reject-empty-message'),
    ModuleErrorScenarioCaseBuilders.branchNode('factory-reject-invalid-scenario'),
    ModuleErrorScenarioCaseBuilders.branchNode('factory-scenario-defaults'),
    ModuleErrorScenarioCaseBuilders.branchNode('find-cause-circular'),
    ModuleErrorScenarioCaseBuilders.branchNode('find-cause-first-match'),
    ModuleErrorScenarioCaseBuilders.branchNode('find-cause-match'),
    ModuleErrorScenarioCaseBuilders.branchNode('find-cause-missing'),
    ModuleErrorScenarioCaseBuilders.branchNode('find-cause-subclass'),
    ModuleErrorScenarioCaseBuilders.branchNode('has-cause-circular'),
    ModuleErrorScenarioCaseBuilders.branchNode('has-cause-deep'),
    ModuleErrorScenarioCaseBuilders.branchNode('has-cause-empty'),
    ModuleErrorScenarioCaseBuilders.branchNode('has-cause-false'),
    ModuleErrorScenarioCaseBuilders.branchNode('has-cause-true'),
    ModuleErrorScenarioCaseBuilders.branchNode('http-allows-status-override'),
    ModuleErrorScenarioCaseBuilders.branchNode('http-uses-scenario-code'),
    ModuleErrorScenarioCaseBuilders.branchNode('instanceof-error'),
    ModuleErrorScenarioCaseBuilders.branchNode('instanceof-module-error'),
    ModuleErrorScenarioCaseBuilders.branchNode('instanceof-subclass'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-basic'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-deep-chain'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-depth-sentinel'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-excludes-undefined'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-module-cause'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-native-cause'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-optional-context'),
    ModuleErrorScenarioCaseBuilders.branchNode('json-safe'),
    ModuleErrorScenarioCaseBuilders.branchNode('retryable-permanent'),
    ModuleErrorScenarioCaseBuilders.branchNode('retryable-transient'),
    ModuleErrorScenarioCaseBuilders.branchNode('scenario-defaults'),
    ModuleErrorScenarioCaseBuilders.branchNode('scenario-retryable-overrides'),
    ModuleErrorScenarioCaseBuilders.branchNode('stack-trace'),
    ModuleErrorScenarioCaseBuilders.branchNode('stack-trace-disabled'),
    ModuleErrorScenarioCaseBuilders.branchNode('subclass-custom'),
    ModuleErrorScenarioCaseBuilders.branchNode('subclass-overrides-defaults'),
    ModuleErrorScenarioCaseBuilders.branchNode('subclass-serialization-name')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
