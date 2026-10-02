import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const contextSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const contextNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class SubclassExtensionScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'auditId': { 'type': 'string' },
            'baseError': { 'type': 'boolean' },
            'chainLength': { 'type': 'number' },
            'code': { 'type': 'string' },
            'context': contextSchema,
            'error': { 'type': 'boolean' },
            'found': { 'type': 'boolean' },
            'instanceOf': { 'type': 'boolean' },
            'jsonHasAuditId': { 'type': 'boolean' },
            'message': { 'type': 'string' },
            'messagePrefix': { 'type': 'string' },
            'moduleError': { 'type': 'boolean' },
            'name': { 'type': 'string' },
            'networkModuleError': { 'type': 'boolean' },
            'policy': { 'type': 'string' },
            'runtimeError': { 'type': 'boolean' },
            'status': { 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'auditId': { 'type': 'string' },
            'causeMessage': { 'type': 'string' },
            'context': contextSchema,
            'message': { 'type': 'string' },
            'policy': { 'type': 'string' }
          },
          'required': [],
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

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'auditId': SchemaNode.defineString({ 'type': 'string' } as const),
        'baseError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'chainLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'code': SchemaNode.defineString({ 'type': 'string' } as const),
        'context': contextNode,
        'error': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'found': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'instanceOf': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'jsonHasAuditId': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'messagePrefix': SchemaNode.defineString({ 'type': 'string' } as const),
        'moduleError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'networkModuleError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'policy': SchemaNode.defineString({ 'type': 'string' } as const),
        'runtimeError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'auditId': SchemaNode.defineString({ 'type': 'string' } as const),
        'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'context': contextNode,
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'policy': SchemaNode.defineString({ 'type': 'string' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `subclass-extension.loop.spec.ts` exercises across a `BaseError`/`ModuleError` subclass's own contract. */
export namespace SubclassExtensionScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      SubclassExtensionScenarioCaseBuilders.branchSchema('audit-instanceof'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('audit-json-base'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('audit-json-extra'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('audit-json-independent'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('audit-name'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('audit-user-message'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-cause-chain'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-find-cause'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-has-cause'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-instanceof'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-json-context'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-json-name'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-json-status-code'),
      SubclassExtensionScenarioCaseBuilders.branchSchema('network-name')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SubclassExtensionScenarioCaseBuilders.branchNode('audit-instanceof'),
    SubclassExtensionScenarioCaseBuilders.branchNode('audit-json-base'),
    SubclassExtensionScenarioCaseBuilders.branchNode('audit-json-extra'),
    SubclassExtensionScenarioCaseBuilders.branchNode('audit-json-independent'),
    SubclassExtensionScenarioCaseBuilders.branchNode('audit-name'),
    SubclassExtensionScenarioCaseBuilders.branchNode('audit-user-message'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-cause-chain'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-find-cause'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-has-cause'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-instanceof'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-json-context'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-json-name'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-json-status-code'),
    SubclassExtensionScenarioCaseBuilders.branchNode('network-name')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
