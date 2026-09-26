import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApplyArrayConstraintBrandsType } from '../../../../src/types/index.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';
import type { Assert, Equal } from './type-level-assert.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type IsAssignableType<A, B> = A extends B ? true : false;
type ExpectFalseType<T extends false> = T;

/** Compiles only if `value` structurally satisfies `T` — the type-level half of each case below. */
function assertAssignable<T>(value: T): void {
  void value;
}

// TS4023 regression: a `Node` combining an array/object count brand with an ADDITIONAL
// unconstrained generic (the item/property static type) failed declaration emit because
// the brand's own phantom symbol was unnameable outside its declaring module. The brand
// types moved from type aliases to interfaces (packages/entity/src/interfaces/*BrandInterface.ts)
// specifically to keep the symbol reference nameable through inference. `tsc -b --force`
// across the workspace is the actual proof; these checks prove the brands still distinguish
// their literal argument. `IsAssignableType` (single-direction `extends`) is used for the
// cross-brand checks rather than the double-negation `EqualType` trick, which the compiler
// resolves unreliably against these deferred generic-alias intersections.

const maxItemsThreeItemNode = SchemaNode.defineString({ 'type': 'string' } as const);
const maxItemsThreeNode = SchemaNode.defineArray({ 'type': 'array', 'maxItems': 3 } as const, maxItemsThreeItemNode);
const maxItemsFourNode = SchemaNode.defineArray({ 'type': 'array', 'maxItems': 4 } as const, SchemaNode.defineString({ 'type': 'string' } as const));
type MaxItemsThreeStaticType = NodeStaticType<typeof maxItemsThreeNode>;
type MaxItemsFourStaticType = NodeStaticType<typeof maxItemsFourNode>;

// The brand is real (not erased to a plain array) and it carries its own literal argument.
type ArrayBrandExistsCheck = ExpectFalseType<EqualType<MaxItemsThreeStaticType, string[]>>;
type ArrayBrandCarriesLiteralCheck = ExpectFalseType<IsAssignableType<MaxItemsFourStaticType, MaxItemsThreeStaticType>>;

const uniqueNode = SchemaNode.defineArray({ 'type': 'array', 'uniqueItems': true } as const, SchemaNode.defineNumber({ 'type': 'number' } as const));
type UniqueStaticType = NodeStaticType<typeof uniqueNode>;
type UniqueBrandExistsCheck = ExpectFalseType<EqualType<UniqueStaticType, number[]>>;

const minPropertiesOneNode = SchemaNode.defineObject({ 'type': 'object', 'minProperties': 1 } as const, {}, [] as const);
const minPropertiesTwoNode = SchemaNode.defineObject({ 'type': 'object', 'minProperties': 2 } as const, {}, [] as const);
type MinPropertiesOneStaticType = NodeStaticType<typeof minPropertiesOneNode>;
type MinPropertiesTwoStaticType = NodeStaticType<typeof minPropertiesTwoNode>;

type ObjectBrandCarriesLiteralCheck = ExpectFalseType<IsAssignableType<MinPropertiesTwoStaticType, MinPropertiesOneStaticType>>;

// A maxItems-3 string array is exactly the array constraint brands intersected with a plain string array.
type MaxItemsThreeExpectedType = ApplyArrayConstraintBrandsType<{ 'type': 'array'; 'maxItems': 3 }> & NodeStaticType<typeof maxItemsThreeItemNode>[];
type MaxItemsThreeShapeCheck = Assert<Equal<MaxItemsThreeStaticType, MaxItemsThreeExpectedType>>;

void describe('array/object constraint brands after the TS4023 fix', () => {
  void it('type-checks the brand-distinctness cases above (enforced by tsc -b)', () => {
    const checks: [ArrayBrandExistsCheck, ArrayBrandCarriesLiteralCheck, UniqueBrandExistsCheck, ObjectBrandCarriesLiteralCheck] = [false, false, false, false];

    assert.ok(checks.every((check) => check === false));
  });

  void it('a value shaped for maxItems 3 assigns as a plain string array', () => {
    const check: MaxItemsThreeShapeCheck = true;
    const three: string[] = ['a', 'b'];

    assert.ok(check);
    assertAssignable<string[]>(three);
    assert.deepEqual(three, ['a', 'b']);
  });
});
