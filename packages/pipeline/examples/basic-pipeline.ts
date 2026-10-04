/**
 * basic-pipeline — fulfil a Northstar Books order through fixed validation,
 * pricing, and warehouse-routing stages.
 *
 * Run: npx tsx packages/pipeline/examples/basic-pipeline.ts
 */

import type { EntityCreateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';
import assert from 'node:assert/strict';

import { Pipeline } from '../src/index.js';

// #region usage
namespace NorthstarOrderEntity {
  const Schema = {
    'additionalProperties': false,
    'properties': {
      'deliveryZone': { 'enum': ['local', 'regional'], 'type': 'string' },
      'isbn': { 'maxLength': 13, 'minLength': 13, 'type': 'string' },
      'quantity': { 'minimum': 1, 'type': 'integer' },
      'route': { 'enum': ['northstar-local', 'northstar-regional'], 'type': 'string' },
      'totalCents': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['deliveryZone', 'isbn', 'quantity'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'deliveryZone': SchemaNode.defineEnum({}, ['local', 'regional'] as const),
    'isbn': SchemaNode.defineString({ 'maxLength': 13, 'minLength': 13, 'type': 'string' } as const),
    'quantity': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const),
    'route': SchemaNode.defineEnum({}, ['northstar-local', 'northstar-regional'] as const),
    'totalCents': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)
  }, ['deliveryZone', 'isbn', 'quantity'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}

class NorthstarOrderStages {
  static price(order: NorthstarOrderEntity.Type): NorthstarOrderEntity.Type {
    const pricedOrder = NorthstarOrderEntity.create({ ...order, 'totalCents': order.quantity * 2499 });
    return pricedOrder;
  }

  static route(order: NorthstarOrderEntity.Type): NorthstarOrderEntity.Type {
    const routedOrder = NorthstarOrderEntity.create({
      ...order,
      'route': order.deliveryZone === 'local' ? 'northstar-local' : 'northstar-regional'
    });
    return routedOrder;
  }
}

const fulfilOrder = Pipeline.create<NorthstarOrderEntity.Type>([
  NorthstarOrderStages.price,
  NorthstarOrderStages.route
]);

const order = await fulfilOrder.run(NorthstarOrderEntity.create({
  'deliveryZone': 'regional',
  'isbn': '9780132350884',
  'quantity': 2
}));

console.log(`Northstar Books order ${order.isbn}: ${order.quantity} copy/copies, $${(order.totalCents ?? 0) / 100}, ${order.route}`);
// #endregion usage

assert.equal(order.totalCents, 4998);
assert.equal(order.route, 'northstar-regional');

console.log('basic-pipeline: all assertions passed');
