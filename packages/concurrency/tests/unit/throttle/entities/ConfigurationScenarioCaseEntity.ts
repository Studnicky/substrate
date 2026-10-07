import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const concurrencyLimitSchema = { 'oneOf': [{ 'type': 'number' }, { 'const': 'NaN' }] } as const;
const concurrencyLimitNode = SchemaNode.defineOneOf({}, [
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineConst({}, 'NaN' as const)
] as const);

const throttleInputSchema = {
  'additionalProperties': false,
  'properties': { 'concurrencyLimit': concurrencyLimitSchema },
  'required': [],
  'type': 'object'
} as const;

const throttleInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': concurrencyLimitNode }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const inputSchema = {
  'additionalProperties': false,
  'properties': { 'throttle': throttleInputSchema },
  'required': ['throttle'],
  'type': 'object'
} as const;

const inputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': throttleInputNode }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} });

class ConfigurationScenarioCaseEntityBuilders {
  static withConcurrencyLimitExpectedSchema<const TShape extends string>(shape: TShape) {const result = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'concurrencyLimit': { 'type': 'number' } },
        'required': ['concurrencyLimit'],
        'type': 'object'
      },
      'input': inputSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  return result;}

  static withConcurrencyLimitExpectedNode<const TShape extends string>(shape: TShape) {const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencyLimit'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': inputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return result;}

  static withErrorNameExpectedSchema<const TShape extends string>(shape: TShape) {const result = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'errorName': { 'minLength': 1, 'type': 'string' } },
        'required': ['errorName'],
        'type': 'object'
      },
      'input': inputSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  return result;}

  static withErrorNameExpectedNode<const TShape extends string>(shape: TShape) {const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': inputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return result;}
}

const defaultConfigSchema = ConfigurationScenarioCaseEntityBuilders.withConcurrencyLimitExpectedSchema('default-config');
const defaultConfigNode = ConfigurationScenarioCaseEntityBuilders.withConcurrencyLimitExpectedNode('default-config');
const customConcurrencyLimitSchema = ConfigurationScenarioCaseEntityBuilders.withConcurrencyLimitExpectedSchema('custom-concurrency-limit');
const customConcurrencyLimitNode = ConfigurationScenarioCaseEntityBuilders.withConcurrencyLimitExpectedNode('custom-concurrency-limit');
const missingConcurrencyLimitUsesDefaultSchema = ConfigurationScenarioCaseEntityBuilders.withConcurrencyLimitExpectedSchema('missing-concurrency-limit-uses-default');
const missingConcurrencyLimitUsesDefaultNode = ConfigurationScenarioCaseEntityBuilders.withConcurrencyLimitExpectedNode('missing-concurrency-limit-uses-default');
const invalidConcurrencyLimitSchema = ConfigurationScenarioCaseEntityBuilders.withErrorNameExpectedSchema('invalid-concurrency-limit');
const invalidConcurrencyLimitNode = ConfigurationScenarioCaseEntityBuilders.withErrorNameExpectedNode('invalid-concurrency-limit');
const invalidConcurrencyLimitNanSchema = ConfigurationScenarioCaseEntityBuilders.withErrorNameExpectedSchema('invalid-concurrency-limit-nan');
const invalidConcurrencyLimitNanNode = ConfigurationScenarioCaseEntityBuilders.withErrorNameExpectedNode('invalid-concurrency-limit-nan');

const acceptsValidConfigurationSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'accepted': { 'const': true }, 'defaultAccepted': { 'const': true } },
      'required': ['accepted', 'defaultAccepted'],
      'type': 'object'
    },
    'input': inputSchema,
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'accepts-valid-configuration' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const acceptsValidConfigurationNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const), 'defaultAccepted': SchemaNode.defineConst({}, true as const) }, ['accepted', 'defaultAccepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': inputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'accepts-valid-configuration' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The six scenario case shapes `configuration.loop.spec.ts` exercises. */
export namespace ConfigurationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      defaultConfigSchema, customConcurrencyLimitSchema, missingConcurrencyLimitUsesDefaultSchema,
      invalidConcurrencyLimitSchema, invalidConcurrencyLimitNanSchema, acceptsValidConfigurationSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    defaultConfigNode, customConcurrencyLimitNode, missingConcurrencyLimitUsesDefaultNode,
    invalidConcurrencyLimitNode, invalidConcurrencyLimitNanNode, acceptsValidConfigurationNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
