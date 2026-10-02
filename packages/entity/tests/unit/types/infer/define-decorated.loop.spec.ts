import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, EqualType, IsOptionalKeyType, RefuteType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

// The child node this test wraps: an object with two sub-properties, no `default` of its own.
const childNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'end': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const decoratedNode = SchemaNode.defineDecorated({ 'default': { 'end': 1, 'start': 0 } } as const, childNode);

const objectNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': decoratedNode }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('SchemaNode.defineDecorated', () => {
  void it('type-checks the decoration cases above (enforced by tsc -b)', () => {
    const checks: [
      // The wrapper decorates, it does not restate or alter: the child's own derived shape is unchanged.
      AssertType<EqualType<NodeStaticType<typeof decoratedNode>, NodeStaticType<typeof childNode>>>,
      AssertType<EqualType<NodeInputType<typeof decoratedNode>, NodeInputType<typeof childNode>>>,
      // A `default`-bearing decorated property is PRESENT on the enclosing object's static type…
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof objectNodeType>, 'range'>>,
      // …and OPTIONAL on the enclosing object's input type, the same asymmetry every other
      // `default`-bearing property gets.
      AssertType<IsOptionalKeyType<NodeInputType<typeof objectNodeType>, 'range'>>
    ] = [true, true, false, true];

    assert.deepEqual(checks, [true, true, false, true]);
  });

  void it('carries only the decoration in the runtime schema, never the child\'s restated shape', () => {
    assert.deepEqual(decoratedNode.schema, { 'default': { 'end': 1, 'start': 0 } });
  });
});
