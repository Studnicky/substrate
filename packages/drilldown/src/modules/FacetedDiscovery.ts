import { Predicates } from '@studnicky/types';

import type {
  FacetAccessorMapType,
  FacetFilterStateType
} from '../types/index.js';

class FacetFilterState {
  static checkActive<TDimension extends string>(filter: FacetFilterStateType<TDimension>, dimension: TDimension): boolean {
    const result = !Predicates.isNullish(filter[dimension]);
    return result;
  }

  static checkAllowList(value: string | null, allowList: ReadonlySet<string> | null | undefined): boolean {
    if (Predicates.isNullish(allowList) || value === null) { return true; }
    const result = allowList.has(value);
    return result;
  }

  static getSelectionSet<TDimension extends string>(
    filter: FacetFilterStateType<TDimension>,
    dimension: TDimension
  ): ReadonlySet<string> {
    const result = filter[dimension] ?? new Set();
    return result;
  }

  static withDimension<TDimension extends string>(
    filter: FacetFilterStateType<TDimension>,
    dimension: TDimension,
    values: ReadonlySet<string> | null
  ): FacetFilterStateType<TDimension> {
    const result = { ...filter };

    Object.defineProperty(result, dimension, { 'enumerable': true, 'value': values });
    return result;
  }
}

/**
 * Generic faceted discovery for DrillDown consumers.
 *
 * Given a typed row collection, a stable dimension order, and per-dimension
 * accessors, this computes cascading facet options and resolves proposed
 * selections so downstream renderers share the same drilldown filter state.
 */
export class FacetedDiscovery {
  static apply<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    filter: FacetFilterStateType<TDimension>,
    accessors: FacetAccessorMapType<TRecord, TDimension>
  ): TRecord[] {
    const result = rows.filter((row) => {
      for (let index = 0; index < dimensions.length; index++) {
        const dimension = dimensions[index]!;
        const accessor = accessors[dimension];
        if (accessor === undefined) { continue; }
        if (!FacetFilterState.checkAllowList(accessor(row), filter[dimension])) { return false; }
      }
      return true;
    });
    return result;
  }

  static facetOptions<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    filter: FacetFilterStateType<TDimension>,
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    dimension: TDimension
  ): ReadonlySet<string> {
    const accessor = accessors[dimension];
    if (accessor === undefined) { return new Set(); }
    const candidates = FacetedDiscovery.apply(rows, dimensions, FacetFilterState.withDimension(filter, dimension, null), accessors);
    const result = new Set<string>();
    for (let index = 0; index < candidates.length; index++) {
      const value = accessor(candidates[index]!);
      if (value !== null) { result.add(value); }
    }
    return result;
  }

  static resolveFilterState<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    proposed: FacetFilterStateType<TDimension>,
    changedDimension: TDimension
  ): FacetFilterStateType<TDimension> {
    const { 'filter': relaxed, widened } = FacetedDiscovery.relax(rows, dimensions, accessors, proposed, changedDimension);
    const skip = new Set<TDimension>([changedDimension]);
    if (widened !== null) { skip.add(widened); }
    const result = FacetedDiscovery.autoNarrow(rows, dimensions, accessors, relaxed, skip);
    return result;
  }

  private static autoNarrow<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    filter: FacetFilterStateType<TDimension>,
    skip: ReadonlySet<TDimension>
  ): FacetFilterStateType<TDimension> {
    let current = filter;
    for (let index = 0; index < dimensions.length; index++) {
      const dimension = dimensions[index]!;

      if (skip.has(dimension)) { continue; }
      const validValues = FacetedDiscovery.facetOptions(rows, dimensions, current, accessors, dimension);
      if (validValues.size === 0) { continue; }

      if (!FacetFilterState.checkActive(current, dimension)) {
        const universe = FacetedDiscovery.facetOptions(rows, dimensions, {}, accessors, dimension);
        if (validValues.size < universe.size) { current = FacetFilterState.withDimension(current, dimension, validValues); }
        continue;
      }

      const currentSelection = FacetFilterState.getSelectionSet(current, dimension);
      const currentSelectionValues = Array.from(currentSelection);
      const intersection = new Set<string>();

      for (let valueIndex = 0; valueIndex < currentSelectionValues.length; valueIndex++) {
        const value = currentSelectionValues[valueIndex]!;

        if (validValues.has(value)) {
          intersection.add(value);
        }
      }
      if (intersection.size < currentSelection.size) { current = FacetFilterState.withDimension(current, dimension, intersection); }
    }
    return current;
  }

  private static isEmptyResult<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    filter: FacetFilterStateType<TDimension>
  ): boolean {
    const result = FacetedDiscovery.apply(rows, dimensions, filter, accessors).length === 0;
    return result;
  }

  private static relax<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    proposed: FacetFilterStateType<TDimension>,
    changedDimension: TDimension
  ): { readonly 'filter': FacetFilterStateType<TDimension>; readonly 'widened': TDimension | null } {
    if (!FacetedDiscovery.isEmptyResult(rows, dimensions, accessors, proposed)) {
      return { 'filter': proposed, 'widened': null };
    }

    for (let index = 0; index < dimensions.length; index++) {
      const dimension = dimensions[index]!;

      if (dimension === changedDimension || !FacetFilterState.checkActive(proposed, dimension)) { continue; }
      const candidateValues = FacetedDiscovery.facetOptions(rows, dimensions, FacetFilterState.withDimension(proposed, dimension, null), accessors, dimension);
      if (candidateValues.size === 0) { continue; }
      const widenedValues = new Set([...FacetFilterState.getSelectionSet(proposed, dimension), ...candidateValues]);
      const test = FacetFilterState.withDimension(proposed, dimension, widenedValues);
      if (!FacetedDiscovery.isEmptyResult(rows, dimensions, accessors, test)) {
        return { 'filter': test, 'widened': dimension };
      }
    }

    return { 'filter': proposed, 'widened': null };
  }
}
