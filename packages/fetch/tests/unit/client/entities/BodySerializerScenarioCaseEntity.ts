import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `body-serializer.loop.spec.ts` scenario case shape: one `oneOf` branch per `shape`. */
export namespace BodySerializerScenarioCaseEntity {
  const caseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' } } as const;
  const caseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };
  const decisionExpectedSchema = { 'additionalProperties': false, 'properties': { 'decision': { 'type': 'boolean' } }, 'required': ['decision'], 'type': 'object' } as const;
  const DecisionExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'decision': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['decision'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  function decisionBranch<TShape extends string>(shape: TShape, bodySchema: object) {
    return {
      'additionalProperties': false,
      'properties': { ...caseFields, 'expected': decisionExpectedSchema, 'input': { 'additionalProperties': false, 'properties': { 'body': bodySchema }, 'required': ['body'], 'type': 'object' }, 'shape': { 'const': shape } },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function decisionBranchNode<TShape extends string, TBodyNode extends SchemaNodeInterface<unknown, unknown>>(shape: TShape, bodyNode: TBodyNode) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, { ...caseNodeFields, 'expected': DecisionExpectedNode, 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'body': bodyNode }, ['body'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'shape': SchemaNode.defineConst({}, shape) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

  const arrayBodySchema = { 'items': { 'type': 'number' }, 'type': 'array' } as const;
  const ArrayBodyNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined);
  const bufferBodySchema = { 'additionalProperties': false, 'properties': { 'bytes': { 'items': { 'type': 'integer' }, 'type': 'array' }, 'shape': { 'const': 'buffer' } }, 'required': ['bytes', 'shape'], 'type': 'object' } as const;
  const BufferBodyNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'bytes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const), undefined), 'shape': SchemaNode.defineConst({}, 'buffer' as const) }, ['bytes', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const objectBodySchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const ObjectBodyNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });
  const primitiveBodySchema = { 'type': 'string' } as const;
  const PrimitiveBodyNode = SchemaNode.defineString({ 'type': 'string' } as const);

  const viewInputSchema = {
    'additionalProperties': false,
    'properties': {
      'shape': { 'const': 'data-view-visible-range' },
      'source': { 'items': { 'type': 'integer' }, 'type': 'array' },
      'view': { 'additionalProperties': false, 'properties': { 'byteLength': { 'type': 'integer' }, 'byteOffset': { 'type': 'integer' } }, 'required': ['byteLength', 'byteOffset'], 'type': 'object' }
    },
    'required': ['shape', 'source', 'view'],
    'type': 'object'
  } as const;
  const ViewInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'shape': SchemaNode.defineConst({}, 'data-view-visible-range' as const),
      'source': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const), undefined),
      'view': SchemaNode.defineObject({ 'type': 'object' } as const, { 'byteLength': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'byteOffset': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['byteLength', 'byteOffset'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['shape', 'source', 'view'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const viewExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'bytes': { 'items': { 'type': 'integer' }, 'type': 'array' }, 'constructorName': { 'const': 'Uint8Array' } },
    'required': ['bytes', 'constructorName'],
    'type': 'object'
  } as const;
  const ViewExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'bytes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const), undefined), 'constructorName': SchemaNode.defineConst({}, 'Uint8Array' as const) }, ['bytes', 'constructorName'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const dataViewVisibleRangeSchema = {
    'additionalProperties': false,
    'properties': { ...caseFields, 'expected': viewExpectedSchema, 'input': viewInputSchema, 'shape': { 'const': 'data-view-visible-range' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const DataViewVisibleRangeNode = SchemaNode.defineObject({ 'type': 'object' } as const, { ...caseNodeFields, 'expected': ViewExpectedNode, 'input': ViewInputNode, 'shape': SchemaNode.defineConst({}, 'data-view-visible-range' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const typedArrayInputSchema = {
    'additionalProperties': false,
    'properties': { 'shape': { 'const': 'typed-array-byte-range' }, 'source': { 'items': { 'type': 'integer' }, 'type': 'array' }, 'typedArray': { 'const': 'Uint16Array' } },
    'required': ['shape', 'source', 'typedArray'],
    'type': 'object'
  } as const;
  const TypedArrayInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'typed-array-byte-range' as const), 'source': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const), undefined), 'typedArray': SchemaNode.defineConst({}, 'Uint16Array' as const) }, ['shape', 'source', 'typedArray'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const typedArrayExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'bytes': { 'items': { 'type': 'integer' }, 'type': 'array' }, 'constructorName': { 'const': 'Uint8Array' }, 'remainsDetachedAfterSourceMutation': { 'const': true } },
    'required': ['bytes', 'constructorName', 'remainsDetachedAfterSourceMutation'],
    'type': 'object'
  } as const;
  const TypedArrayExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'bytes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const), undefined),
      'constructorName': SchemaNode.defineConst({}, 'Uint8Array' as const),
      'remainsDetachedAfterSourceMutation': SchemaNode.defineConst({}, true as const)
    }, ['bytes', 'constructorName', 'remainsDetachedAfterSourceMutation'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const typedArrayByteRangeSchema = {
    'additionalProperties': false,
    'properties': { ...caseFields, 'expected': typedArrayExpectedSchema, 'input': typedArrayInputSchema, 'shape': { 'const': 'typed-array-byte-range' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const TypedArrayByteRangeNode = SchemaNode.defineObject({ 'type': 'object' } as const, { ...caseNodeFields, 'expected': TypedArrayExpectedNode, 'input': TypedArrayInputNode, 'shape': SchemaNode.defineConst({}, 'typed-array-byte-range' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      decisionBranch('needs-json-content-type-array', arrayBodySchema),
      decisionBranch('needs-json-content-type-buffer', bufferBodySchema),
      decisionBranch('needs-json-content-type-object', objectBodySchema),
      decisionBranch('needs-json-content-type-primitive', primitiveBodySchema),
      dataViewVisibleRangeSchema,
      typedArrayByteRangeSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    decisionBranchNode('needs-json-content-type-array', ArrayBodyNode),
    decisionBranchNode('needs-json-content-type-buffer', BufferBodyNode),
    decisionBranchNode('needs-json-content-type-object', ObjectBodyNode),
    decisionBranchNode('needs-json-content-type-primitive', PrimitiveBodyNode),
    DataViewVisibleRangeNode,
    TypedArrayByteRangeNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
