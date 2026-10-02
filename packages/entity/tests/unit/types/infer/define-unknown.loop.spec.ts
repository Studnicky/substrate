import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, EqualType, IsAssignableType, RefuteType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

const anyValueNodeType = SchemaNode.defineUnknown({} as const);

const objectWithAnyPropertyNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'found': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineUnknown({} as const) }, ['found', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('SchemaNode.defineUnknown', () => {
  void it('type-checks the unknown-not-any cases above (enforced by tsc -b)', () => {
    // Sound derivation is exactly `unknown`, on both `.static` and `.input`.
    // Not `any`: `any extends string` distributes to `boolean`, which fails the
    // `false`-only constraint at compile time — `unknown extends string` is
    // cleanly `false`, so only a genuine `unknown` derivation type-checks here.
    const checks: [
      AssertType<EqualType<NodeStaticType<typeof anyValueNodeType>, unknown>>,
      AssertType<EqualType<NodeInputType<typeof anyValueNodeType>, unknown>>,
      RefuteType<IsAssignableType<NodeStaticType<typeof anyValueNodeType>, string>>,
      AssertType<EqualType<NodeStaticType<typeof objectWithAnyPropertyNodeType>['value'], unknown>>
    ] = [true, true, false, true];

    assert.equal(checks[0], true);
    assert.equal(checks[1], true);
    assert.equal(checks[2], false);
    assert.equal(checks[3], true);
  });

  void it('accepts any JSON-shaped value at runtime, per the empty schema', () => {
    const numberValue: NodeStaticType<typeof anyValueNodeType> = 42;
    const stringValue: NodeStaticType<typeof anyValueNodeType> = 'anything';
    const objectValue: NodeStaticType<typeof anyValueNodeType> = { 'nested': true };

    assert.equal(numberValue, 42);
    assert.equal(stringValue, 'anything');
    assert.deepEqual(objectValue, { 'nested': true });
  });
});
