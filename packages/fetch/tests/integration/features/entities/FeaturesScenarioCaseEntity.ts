import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

const openObjectSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
const OpenObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

const requestSchema = {
  'additionalProperties': false,
  'properties': { 'options': openObjectSchema, 'url': { 'minLength': 1, 'type': 'string' } },
  'required': ['url'],
  'type': 'object'
} as const;
const RequestNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': OpenObjectNode, 'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['url'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const caseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' } } as const;
const caseNodeFields = {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
};

/** The `features.loop.spec.ts` scenario case shape: one `oneOf` branch per `shape`. */
export namespace FeaturesScenarioCaseEntity {
  class FeaturesScenarioCaseEntityBuilders {
    static statusBranch<TShape extends string>(shape: TShape) {
      const result = {
        'additionalProperties': false,
        'properties': {
          ...caseFields,
          'expected': { 'additionalProperties': false, 'properties': { 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' } }, 'required': ['status'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'fetchClient': openObjectSchema, 'request': requestSchema }, 'required': ['fetchClient', 'request'], 'type': 'object' },
          'shape': { 'const': shape }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }

    static statusBranchNode<TShape extends string>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) }, ['status'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode, 'request': RequestNode }, ['fetchClient', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }

    static abortBranch<TShape extends string>(shape: TShape) {
      const result = {
        'additionalProperties': false,
        'properties': {
          ...caseFields,
          'expected': { 'additionalProperties': false, 'properties': { 'abortErrorName': { 'const': 'AbortError' }, 'urlIncludes': { 'minLength': 1, 'type': 'string' } }, 'required': ['abortErrorName', 'urlIncludes'], 'type': 'object' },
          'input': noRequestInputSchema,
          'shape': { 'const': shape }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }

    static abortBranchNode<TShape extends string>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortErrorName': SchemaNode.defineConst({}, 'AbortError' as const), 'urlIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['abortErrorName', 'urlIncludes'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': NoRequestInputNode,
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }
  }

  const parametersWithBaseUrlSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'itemsLengthAtMost': { 'type': 'integer' } }, 'required': ['itemsLengthAtMost'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'fetchClient': openObjectSchema, 'request': requestSchema }, 'required': ['fetchClient', 'request'], 'type': 'object' },
      'shape': { 'const': 'params-apply-defaults-with-baseURL' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const ParametersWithBaseUrlNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'itemsLengthAtMost': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['itemsLengthAtMost'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode, 'request': RequestNode }, ['fetchClient', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'params-apply-defaults-with-baseURL' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const queryRecordSchema = { 'additionalProperties': { 'type': 'string' }, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const QueryRecordNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineString({ 'type': 'string' } as const), 'patternProperties': {} });
  const parametersWithoutBaseUrlSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'query': queryRecordSchema }, 'required': ['query'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'fetchClient': openObjectSchema, 'request': requestSchema }, 'required': ['fetchClient', 'request'], 'type': 'object' },
      'shape': { 'const': 'params-apply-defaults-without-baseURL' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const ParametersWithoutBaseUrlNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'query': QueryRecordNode }, ['query'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode, 'request': RequestNode }, ['fetchClient', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'params-apply-defaults-without-baseURL' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const noRequestInputSchema = { 'additionalProperties': false, 'properties': { 'fetchClient': openObjectSchema }, 'required': ['fetchClient'], 'type': 'object' } as const;
  const NoRequestInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode }, ['fetchClient'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const timeoutFirstSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'timeoutErrorName': { 'const': 'TimeoutError' } }, 'required': ['timeoutErrorName'], 'type': 'object' },
      'input': noRequestInputSchema,
      'shape': { 'const': 'timeout-first' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const TimeoutFirstNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeoutErrorName': SchemaNode.defineConst({}, 'TimeoutError' as const) }, ['timeoutErrorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': NoRequestInputNode,
    'shape': SchemaNode.defineConst({}, 'timeout-first' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      FeaturesScenarioCaseEntityBuilders.statusBranch('baseURL-prepend-relative'),
      FeaturesScenarioCaseEntityBuilders.statusBranch('baseURL-keep-absolute'),
      FeaturesScenarioCaseEntityBuilders.statusBranch('baseURL-trailing-slash'),
      FeaturesScenarioCaseEntityBuilders.statusBranch('baseURL-path-without-leading-slash'),
      FeaturesScenarioCaseEntityBuilders.statusBranch('headers-apply-defaults'),
      FeaturesScenarioCaseEntityBuilders.statusBranch('headers-merge-default-and-request'),
      FeaturesScenarioCaseEntityBuilders.statusBranch('headers-override-defaults'),
      parametersWithBaseUrlSchema,
      parametersWithoutBaseUrlSchema,
      FeaturesScenarioCaseEntityBuilders.abortBranch('abort-details'),
      FeaturesScenarioCaseEntityBuilders.abortBranch('abort-in-get'),
      FeaturesScenarioCaseEntityBuilders.abortBranch('abort-first'),
      timeoutFirstSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('baseURL-prepend-relative'),
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('baseURL-keep-absolute'),
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('baseURL-trailing-slash'),
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('baseURL-path-without-leading-slash'),
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('headers-apply-defaults'),
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('headers-merge-default-and-request'),
    FeaturesScenarioCaseEntityBuilders.statusBranchNode('headers-override-defaults'),
    ParametersWithBaseUrlNode,
    ParametersWithoutBaseUrlNode,
    FeaturesScenarioCaseEntityBuilders.abortBranchNode('abort-details'),
    FeaturesScenarioCaseEntityBuilders.abortBranchNode('abort-in-get'),
    FeaturesScenarioCaseEntityBuilders.abortBranchNode('abort-first'),
    TimeoutFirstNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
