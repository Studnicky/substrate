import type { NodeStaticType } from '@studnicky/entity/types';

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
  function statusBranch<TShape extends string>(shape: TShape) {
    return {
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
  }
  function statusBranchNode<TShape extends string>(shape: TShape) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) }, ['status'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode, 'request': RequestNode }, ['fetchClient', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

  const paramsWithBaseUrlSchema = {
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
  const ParamsWithBaseUrlNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'itemsLengthAtMost': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['itemsLengthAtMost'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode, 'request': RequestNode }, ['fetchClient', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'params-apply-defaults-with-baseURL' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const queryRecordSchema = { 'additionalProperties': { 'type': 'string' }, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const QueryRecordNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineString({ 'type': 'string' } as const), 'patternProperties': {} });
  const paramsWithoutBaseUrlSchema = {
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
  const ParamsWithoutBaseUrlNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'query': QueryRecordNode }, ['query'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode, 'request': RequestNode }, ['fetchClient', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'params-apply-defaults-without-baseURL' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const noRequestInputSchema = { 'additionalProperties': false, 'properties': { 'fetchClient': openObjectSchema }, 'required': ['fetchClient'], 'type': 'object' } as const;
  const NoRequestInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': OpenObjectNode }, ['fetchClient'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  function abortBranch<TShape extends string>(shape: TShape) {
    return {
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
  }
  function abortBranchNode<TShape extends string>(shape: TShape) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortErrorName': SchemaNode.defineConst({}, 'AbortError' as const), 'urlIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['abortErrorName', 'urlIncludes'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': NoRequestInputNode,
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

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
      statusBranch('baseURL-prepend-relative'),
      statusBranch('baseURL-keep-absolute'),
      statusBranch('baseURL-trailing-slash'),
      statusBranch('baseURL-path-without-leading-slash'),
      statusBranch('headers-apply-defaults'),
      statusBranch('headers-merge-default-and-request'),
      statusBranch('headers-override-defaults'),
      paramsWithBaseUrlSchema,
      paramsWithoutBaseUrlSchema,
      abortBranch('abort-details'),
      abortBranch('abort-in-get'),
      abortBranch('abort-first'),
      timeoutFirstSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    statusBranchNode('baseURL-prepend-relative'),
    statusBranchNode('baseURL-keep-absolute'),
    statusBranchNode('baseURL-trailing-slash'),
    statusBranchNode('baseURL-path-without-leading-slash'),
    statusBranchNode('headers-apply-defaults'),
    statusBranchNode('headers-merge-default-and-request'),
    statusBranchNode('headers-override-defaults'),
    ParamsWithBaseUrlNode,
    ParamsWithoutBaseUrlNode,
    abortBranchNode('abort-details'),
    abortBranchNode('abort-in-get'),
    abortBranchNode('abort-first'),
    TimeoutFirstNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
