import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { FacetAccessorMapType, FacetFilterStateType } from '../../src/index.js';

import { FacetedDiscovery } from '../../src/index.js';

type RowType = {
  'color': string
  'size': string
};

type DimensionType = 'color' | 'size';

function buildRows(): RowType[] {
  return [
    { 'color': 'red', 'size': 'S' },
    { 'color': 'red', 'size': 'M' },
    { 'color': 'blue', 'size': 'S' },
    { 'color': 'blue', 'size': 'S' }
  ];
}

const dimensions: DimensionType[] = ['color', 'size'];
const accessors: FacetAccessorMapType<RowType, DimensionType> = {
  'color': (row) => { return row.color; },
  'size': (row) => { return row.size; }
};

it('facetOptions narrows the sibling dimension based on the active selection', () => {
  const rows = buildRows();

  const sizesForRed = FacetedDiscovery.facetOptions(rows, dimensions, { 'color': new Set(['red']) }, accessors, 'size');
  assert.deepEqual([...sizesForRed].toSorted(), ['M', 'S']);

  const sizesForBlue = FacetedDiscovery.facetOptions(rows, dimensions, { 'color': new Set(['blue']) }, accessors, 'size');
  assert.deepEqual([...sizesForBlue].toSorted(), ['S']);

  const allColors = FacetedDiscovery.facetOptions(rows, dimensions, {}, accessors, 'color');
  assert.deepEqual([...allColors].toSorted(), ['blue', 'red']);
});

it('apply filters rows that satisfy every active dimension', () => {
  const rows = buildRows();
  const filter: FacetFilterStateType<DimensionType> = { 'color': new Set(['blue']), 'size': new Set(['S']) };

  const filtered = FacetedDiscovery.apply(rows, dimensions, filter, accessors);
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((row) => { const result = row.color === 'blue' && row.size === 'S';
  return result; }));
});

it('resolveFilterState auto-narrows an untouched sibling dimension to the intersection', () => {
  const rows = buildRows();

  // Selecting color=red should auto-narrow size to {S, M} — no change from universe here,
  // so exercise a case where the narrow is real: restrict to blue first.
  const proposed: FacetFilterStateType<DimensionType> = { 'color': new Set(['blue']) };
  const resolved = FacetedDiscovery.resolveFilterState(rows, dimensions, accessors, proposed, 'color');

  assert.deepEqual([...(resolved.size ?? new Set())].toSorted(), ['S']);
});

it('resolveFilterState relaxes a proposed selection that would otherwise produce zero rows', () => {
  const rows = buildRows();

  // color=blue AND size=M matches nothing (blue only has size S) — relax must widen size
  // back to a value that keeps the changed dimension's selection satisfiable.
  const proposed: FacetFilterStateType<DimensionType> = { 'color': new Set(['blue']), 'size': new Set(['M']) };
  const resolved = FacetedDiscovery.resolveFilterState(rows, dimensions, accessors, proposed, 'color');

  const result = FacetedDiscovery.apply(rows, dimensions, resolved, accessors);
  assert.ok(result.length > 0);
  assert.ok(result.every((row) => { const isBlue = row.color === 'blue';
  return isBlue; }));
});
