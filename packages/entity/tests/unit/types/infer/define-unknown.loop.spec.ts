import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type IsAssignableType<A, B> = A extends B ? true : false;
type ExpectTrueType<T extends true> = T;
type ExpectFalseType<T extends false> = T;

const anyValueNode = SchemaNode.defineUnknown({} as const);
type AnyValueStaticType = NodeStaticType<typeof anyValueNode>;
type AnyValueInputType = NodeInputType<typeof anyValueNode>;

// Sound derivation is exactly `unknown`, on both `.static` and `.input`.
type StaticIsUnknownCheck = ExpectTrueType<EqualType<AnyValueStaticType, unknown>>;
type InputIsUnknownCheck = ExpectTrueType<EqualType<AnyValueInputType, unknown>>;

// Not `any`: `any extends string` distributes to `boolean`, which fails this
// `false`-only constraint at compile time — `unknown extends string` is
// cleanly `false`, so only a genuine `unknown` derivation type-checks here.
type NotAssignableToStringCheck = ExpectFalseType<IsAssignableType<AnyValueStaticType, string>>;

const objectWithAnyPropertyNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'found': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineUnknown({} as const) },
  ['found', 'value'] as const
);
type ObjectWithAnyPropertyStaticType = NodeStaticType<typeof objectWithAnyPropertyNode>;
type ValueFieldIsUnknownCheck = ExpectTrueType<EqualType<ObjectWithAnyPropertyStaticType['value'], unknown>>;

void describe('SchemaNode.defineUnknown', () => {
  void it('type-checks the unknown-not-any cases above (enforced by tsc -b)', () => {
    const checks: [StaticIsUnknownCheck, InputIsUnknownCheck, NotAssignableToStringCheck, ValueFieldIsUnknownCheck]
      = [true, true, false, true];

    assert.equal(checks[0], true);
    assert.equal(checks[1], true);
    assert.equal(checks[2], false);
    assert.equal(checks[3], true);
  });

  void it('accepts any JSON-shaped value at runtime, per the empty schema', () => {
    const numberValue: AnyValueStaticType = 42;
    const stringValue: AnyValueStaticType = 'anything';
    const objectValue: AnyValueStaticType = { 'nested': true };

    assert.equal(numberValue, 42);
    assert.equal(stringValue, 'anything');
    assert.deepEqual(objectValue, { 'nested': true });
  });
});
