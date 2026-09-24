import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

type IsAssignableType<A, B> = A extends B ? true : false;
type IsOptionalType<T, K extends keyof T> = Record<never, never> extends Pick<T, K> ? true : false;
type ExpectTrueType<T extends true> = T;
type ExpectFalseType<T extends false> = T;

/** Compiles only if `value` structurally satisfies `T` — the type-level half of each case below. */
function assertAssignable<T>(value: T): void {
  void value;
}

// One schema carrying both a constrained required field (`count`) and a
// `default`-bearing optional field (`label`), proving the input/static split
// in one place: `.static` is validated output (branded, default present);
// `.input` is not-yet-validated data (unbranded, default still optional).
const recordNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'count': SchemaNode.defineNumber({ 'type': 'number', 'minimum': 1 } as const),
    'label': SchemaNode.defineString({ 'type': 'string', 'default': 'x' } as const)
  },
  ['count'] as const
);
type RecordStaticType = NodeStaticType<typeof recordNode>;
type RecordInputType = NodeInputType<typeof recordNode>;

// `count` carries the `minimum` brand on `.static`, not on `.input`.
type StaticCountRejectsPlainNumberCheck = ExpectFalseType<IsAssignableType<number, RecordStaticType['count']>>;
type InputCountAcceptsPlainNumberCheck = ExpectTrueType<IsAssignableType<number, RecordInputType['count']>>;

// `label` is present (not optional) on `.static` because it declares `default`,
// but still optional on `.input` — a default fills a gap at intake, it is not
// something the caller must already supply.
type StaticLabelIsPresentCheck = ExpectFalseType<IsOptionalType<RecordStaticType, 'label'>>;
type InputLabelIsOptionalCheck = ExpectTrueType<IsOptionalType<RecordInputType, 'label'>>;

void describe('NodeInputType / default-bearing static promotion', () => {
  void it('type-checks the brand and optionality split above (enforced by tsc -b)', () => {
    const checks: [StaticCountRejectsPlainNumberCheck, InputCountAcceptsPlainNumberCheck, StaticLabelIsPresentCheck, InputLabelIsOptionalCheck]
      = [false, true, false, true];

    assert.ok(checks[0] === false && checks[1] === true && checks[2] === false && checks[3] === true);
  });

  void it('an input value may omit the default-bearing property; a static value may not', () => {
    const input: RecordInputType = { 'count': 5 };
    const staticValue: RecordStaticType = { 'count': 5, 'label': 'x' } as unknown as RecordStaticType;

    assertAssignable<{ 'count': number; 'label'?: string }>(input);
    assert.deepEqual(input, { 'count': 5 });
    assert.deepEqual(staticValue, { 'count': 5, 'label': 'x' });
  });
});
