import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApplyNumberConstraintBrandsType, ApplyStringConstraintBrandsType } from '../../../../src/types/index.js';
import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, EqualType, IsAssignableType, IsOptionalKeyType, RefuteType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

// One schema carrying both a constrained required field (`count`) and a
// `default`-bearing optional field (`label`), proving the input/static split
// in one place: `.static` is validated output (branded, default present);
// `.input` is not-yet-validated data (unbranded, default still optional).
const recordNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'count': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const),
  'label': SchemaNode.defineString({ 'default': 'x', 'type': 'string' } as const)
}, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('NodeInputType / default-bearing static promotion', () => {
  void it('type-checks the brand and optionality split above (enforced by tsc -b)', () => {
    const checks: [
      // `count` carries the `minimum` brand on `.static`, not on `.input`.
      RefuteType<IsAssignableType<number, NodeStaticType<typeof recordNodeType>['count']>>,
      AssertType<IsAssignableType<number, NodeInputType<typeof recordNodeType>['count']>>,
      // `label` is present (not optional) on `.static` because it declares `default`,
      // but still optional on `.input` — a default fills a gap at intake, it is not
      // something the caller must already supply.
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof recordNodeType>, 'label'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof recordNodeType>, 'label'>>
    ] = [false, true, false, true];

    assert.ok(checks[0] === false && checks[1] === true && checks[2] === false && checks[3] === true);
  });

  void it('an input value may omit the default-bearing property; a static value may not', () => {
    const input: NodeInputType<typeof recordNodeType> = { 'count': 5 };
    const staticValue: { 'count': number; 'label': string } = { 'count': 5, 'label': 'x' };
    // `count` carries the `minimum` brand on `.static`; `label` has no brand-bearing keyword, so it stays plain `string`.
    const shapeChecks: [
      AssertType<EqualType<NodeStaticType<typeof recordNodeType>['count'], ApplyNumberConstraintBrandsType<{ 'minimum': 1; 'type': 'number'; }>>>,
      AssertType<EqualType<NodeStaticType<typeof recordNodeType>['label'], ApplyStringConstraintBrandsType<{ 'default': 'x'; 'type': 'string'; }>>>
    ] = [true, true];
    const widenedInput: { 'count': number; 'label'?: string } = input;

    assert.ok(shapeChecks.every(Boolean));
    assert.deepEqual(widenedInput, { 'count': 5 });
    assert.deepEqual(staticValue, { 'count': 5, 'label': 'x' });
  });
});
