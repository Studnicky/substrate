import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApplyArrayConstraintBrandsType } from '../../../../src/types/index.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, EqualType, IsAssignableType, RefuteType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

// TS4023 regression: a `Node` combining an array/object count brand with an ADDITIONAL
// unconstrained generic (the item/property static type) failed declaration emit because
// the brand's own phantom symbol was unnameable outside its declaring module. The brand
// types moved from type aliases to interfaces (packages/entity/src/interfaces/*BrandInterface.ts)
// specifically to keep the symbol reference nameable through inference. `tsc -b --force`
// across the workspace is the actual proof; these checks prove the brands still distinguish
// their literal argument. `IsAssignableType` (single-direction `extends`) is used for the
// cross-brand checks rather than the double-negation `EqualType` trick, which the compiler
// resolves unreliably against these deferred generic-alias intersections.

const maximumItemsThreeItemNode = SchemaNode.defineString({ 'type': 'string' } as const);
const maximumItemsThreeNodeType = SchemaNode.defineArray({ 'maxItems': 3, 'type': 'array' } as const, maximumItemsThreeItemNode, undefined);
const maximumItemsFourNodeType = SchemaNode.defineArray({ 'maxItems': 4, 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined);

const uniqueNodeType = SchemaNode.defineArray({ 'type': 'array', 'uniqueItems': true } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined);

const minimumPropertiesOneNodeType = SchemaNode.defineObject({ 'minProperties': 1, 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
const minimumPropertiesTwoNodeType = SchemaNode.defineObject({ 'minProperties': 2, 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('array/object constraint brands after the TS4023 fix', () => {
  void it('type-checks the brand-distinctness cases above (enforced by tsc -b)', () => {
    const checks: [
      // The brand is real (not erased to a plain array) and it carries its own literal argument.
      RefuteType<EqualType<NodeStaticType<typeof maximumItemsThreeNodeType>, string[]>>,
      RefuteType<IsAssignableType<NodeStaticType<typeof maximumItemsFourNodeType>, NodeStaticType<typeof maximumItemsThreeNodeType>>>,
      RefuteType<EqualType<NodeStaticType<typeof uniqueNodeType>, number[]>>,
      RefuteType<IsAssignableType<NodeStaticType<typeof minimumPropertiesTwoNodeType>, NodeStaticType<typeof minimumPropertiesOneNodeType>>>
    ] = [false, false, false, false];

    assert.ok(checks.every((check) => {
      const isRefuted = check === false;
      return isRefuted;
    }));
  });

  void it('a value shaped for maxItems 3 assigns as a plain string array', () => {
    // A maxItems-3 string array is exactly the array constraint brands intersected with a plain string array.
    const check: AssertType<EqualType<NodeStaticType<typeof maximumItemsThreeNodeType>, ApplyArrayConstraintBrandsType<{ 'maxItems': 3; 'type': 'array'; }> & NodeStaticType<typeof maximumItemsThreeItemNode>[]>> = true;
    const three: string[] = ['a', 'b'];

    assert.ok(check);
    assert.deepEqual(three, ['a', 'b']);
  });
});
