import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;
type ExpectFalseType<T extends false> = T;
type IsOptionalKeyType<T, K extends keyof T> = Record<never, never> extends Pick<T, K> ? true : false;

// The child node this test wraps: an object with two sub-properties, no `default` of its own.
const childNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'end': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} });
type ChildStaticType = NodeStaticType<typeof childNode>;
type ChildInputType = NodeInputType<typeof childNode>;

const decoratedNode = SchemaNode.defineDecorated({ 'default': { 'end': 1, 'start': 0 } } as const, childNode);
type DecoratedStaticType = NodeStaticType<typeof decoratedNode>;
type DecoratedInputType = NodeInputType<typeof decoratedNode>;

// The wrapper decorates, it does not restate or alter: the child's own derived shape is unchanged.
type StaticShapeUnchangedCheck = ExpectTrueType<EqualType<DecoratedStaticType, ChildStaticType>>;
type InputShapeUnchangedCheck = ExpectTrueType<EqualType<DecoratedInputType, ChildInputType>>;

const objectNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': decoratedNode }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
type ObjectStaticType = NodeStaticType<typeof objectNode>;
type ObjectInputType = NodeInputType<typeof objectNode>;

// A `default`-bearing decorated property is PRESENT on the enclosing object's static type…
type RangeRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<ObjectStaticType, 'range'>>;
// …and OPTIONAL on the enclosing object's input type, the same asymmetry every other
// `default`-bearing property gets.
type RangeOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<ObjectInputType, 'range'>>;

void describe('SchemaNode.defineDecorated', () => {
  void it('type-checks the decoration cases above (enforced by tsc -b)', () => {
    const checks: [
      StaticShapeUnchangedCheck, InputShapeUnchangedCheck, RangeRequiredOnStaticCheck, RangeOptionalOnInputCheck
    ] = [true, true, false, true];

    assert.deepEqual(checks, [true, true, false, true]);
  });

  void it('carries only the decoration in the runtime schema, never the child\'s restated shape', () => {
    assert.deepEqual(decoratedNode.schema, { 'default': { 'end': 1, 'start': 0 } });
  });
});
