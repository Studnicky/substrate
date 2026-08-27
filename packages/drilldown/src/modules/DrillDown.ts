import type { DiscoverValuesOptionsEntity } from '../entities/DiscoverValuesOptionsEntity.js';
import type { EngineContextEntity } from '../entities/EngineContextEntity.js';
import type { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import type { SortRuleEntity } from '../entities/SortRuleEntity.js';
import type { GroupRuleInterface } from '../interfaces/GroupValueInterface.js';
import type { DataRecordInterface, DrillDownAnalysisInterface, DrillDownInterface, GroupNodeInterface } from '../interfaces/index.js';
import type { DrillDownConfigEntity } from '../schema/DrillDownConfigEntity.js';
import type { FacetAccessorMapType, FacetFilterStateType } from '../types/index.js';

import { DataAnalyzer } from './DataAnalyzer.js';
import { FacetedDiscovery } from './FacetedDiscovery.js';
import {
  filterEngine,
  partitionEngine,
  ruleGenerator,
  sortEngine,
  valueDiscoveryEngine
} from './rules/index.js';

/**
 * Unified recursive multi-level grouping engine.
 *
 * Combines explicit rules and auto property ordering into a single recursive
 * driver. Both paths share one recursive method (groupLevel) and all executor
 * primitives (filter/partition/sort/valueDiscovery).
 *
 * Precedence at every level:
 *   1. EXPLICIT — `explicitGroupRules[depth]` when config.rules is provided.
 *      Per-value `groupValue.rules` restart explicit recursion at depth 0 for
 *      that child subtree.
 *   2. AUTO — `propertyOrder[0]` from config.propertyPriority or data analysis
 *      when no explicit rule applies at the current depth.
 */
export class DrillDown implements DrillDownInterface {
  private readonly groupCountCache = new WeakMap<GroupNodeInterface, number>();

  /**
   * Analyzes data using the same property-order resolver that drives `group()`.
   * Consumers can present the selected grouping and candidate fields without
   * duplicating the engine's discovery logic.
   */
  analyze(data: DataRecordInterface[], config: DrillDownConfigEntity.Type = {}): DrillDownAnalysisInterface {
    const analysis = DataAnalyzer.analyze(data, config.excludeProperties !== undefined
      ? { 'excludeProperties': config.excludeProperties }
      : {});
    return {
      ...analysis,
      'selectedGrouping': this.resolvePropertyOrder(data, config)
    };
  }

  facetOptions<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    filter: FacetFilterStateType<TDimension>,
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    dimension: TDimension
  ): ReadonlySet<string> {
    const result = FacetedDiscovery.facetOptions(rows, dimensions, filter, accessors, dimension);
    return result;
  }

  /**
   * Groups data records into a hierarchical tree.
   * @param data - Records to group
   * @param config - Grouping configuration (rules, property order, limits, filters, sort)
   * @returns Root group node containing the hierarchical data structure
   */
  group(data: DataRecordInterface[], config: DrillDownConfigEntity.Type = {}): GroupNodeInterface {
    if (data.length === 0) {
      const result = this.makeLeaf([], undefined);
      return result;
    }

    const propertyOrder = this.resolvePropertyOrder(data, config);

    const rules = config.rules;

    const topFilter: FilterRuleEntity.Type[] = [
      ...(config.filter ?? []),
      ...(rules?.filter ?? [])
    ];

    const topSort = config.sort ?? rules?.sort;

    const context: EngineContextEntity.Type = {
      'budget': { 'count': 0 },
      'minimumGroupSize': config.minimumGroupSize ?? 1
    };

    if (config.maximumDepth !== undefined) {
      context.maximumDepth = config.maximumDepth;
    }
    if (config.maximumNodes !== undefined) {
      context.maximumNodes = config.maximumNodes;
    }
    if (config.granularity !== undefined) {
      context.granularity = config.granularity;
    }

    const result = this.groupLevel(
      data,
      topFilter,
      propertyOrder,
      0,
      context,
      { 'explicitGroupRules': rules?.group, 'sort': topSort }
    );
    return result;
  }

  resolveFilterState<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    proposed: FacetFilterStateType<TDimension>,
    changedDimension: TDimension
  ): FacetFilterStateType<TDimension> {
    const result = FacetedDiscovery.resolveFilterState(rows, dimensions, accessors, proposed, changedDimension);
    return result;
  }

  private resolvePropertyOrder(data: DataRecordInterface[], config: DrillDownConfigEntity.Type): string[] {
    if (config.propertyPriority !== undefined && config.propertyPriority.length > 0) {
      return config.propertyPriority;
    }

    if (config.rules !== undefined && config.autoGrouping === undefined) {
      // Explicit-rules-only mode: no AUTO fallback when explicit rules exhaust
      return [];
    }

    const autoConfig = config.autoGrouping ?? { 'mode': 'count', 'target': 10 };

    const result = ruleGenerator.orderProperties(data, autoConfig, config.excludeProperties);
    return result;
  }

  private groupLevel(
    subset: DataRecordInterface[],
    filter: FilterRuleEntity.Type[],
    propertyOrder: string[],
    depth: number,
    context: EngineContextEntity.Type,
    options?: { 'explicitGroupRules'?: GroupRuleInterface[] | undefined, 'sort'?: SortRuleEntity.Type[] | undefined }
  ): GroupNodeInterface {
    const sort = options?.sort;
    const explicitGroupRules = options?.explicitGroupRules;
    const filteredData = filterEngine.applyFilters(subset, filter);

    if (filteredData.length === 0) {
      const result = this.makeLeaf(filteredData, sort);
      return result;
    }

    if (context.maximumNodes !== undefined && context.budget.count >= context.maximumNodes) {
      const result = this.makeLeaf(filteredData, sort);
      return result;
    }

    if (context.maximumDepth !== undefined && depth >= context.maximumDepth) {
      const result = this.makeLeaf(filteredData, sort);
      return result;
    }

    const resolved = this.resolveGroupRule(filteredData, propertyOrder, depth, explicitGroupRules, context);

    if (resolved === null) {
      const result = this.makeLeaf(filteredData, sort);
      return result;
    }

    const currentRule = resolved.rule;
    const wasExplicit = resolved.wasExplicit;
    const hasGroupOutliers = currentRule.groupOutliers === true;

    if (!hasGroupOutliers && filteredData.length <= context.minimumGroupSize) {
      const result = this.makeLeaf(filteredData, sort);
      return result;
    }

    const { matched, ungroupable } = partitionEngine.partitionByProperty(filteredData, currentRule);

    const node: GroupNodeInterface = {
      'grouped': [],
      'property': null,
      'ungrouped': null,
      'value': null
    };

    context.budget.count++;

    // In EXPLICIT mode the propertyOrder is preserved for fallback at deeper depths.
    // In AUTO mode the current property is consumed by advancing the slice.
    const nextPropertyOrder = wasExplicit ? propertyOrder : propertyOrder.slice(1);

    for (let matchedIndex = 0; matchedIndex < matched.length; matchedIndex++) {
      const group = matched[matchedIndex]!;

      if (group.nodes.length === 0) {
        continue;
      }

      const perValueRules = group.groupValue.rules;

      let childExplicit: GroupRuleInterface[] | undefined;
      let childDepth: number;
      let childPropertyOrder: string[];
      let childFilter: FilterRuleEntity.Type[];
      let childSort: SortRuleEntity.Type[] | undefined;

      if (perValueRules !== undefined) {
        // Per-value nested rules: subtree is self-contained — restart explicit rules at depth 0.
        childExplicit = perValueRules.group;
        childDepth = 0;
        childPropertyOrder = [];
        childFilter = perValueRules.filter !== undefined
          ? [...filter, ...perValueRules.filter]
          : filter;
        childSort = perValueRules.sort ?? sort;
      } else {
        // Standard descent: advance depth; AUTO mode also advances propertyOrder.
        childExplicit = explicitGroupRules;
        childDepth = depth + 1;
        childPropertyOrder = nextPropertyOrder;
        childFilter = filter;
        childSort = sort;
      }

      const childNode = this.groupLevel(
        group.nodes,
        childFilter,
        childPropertyOrder,
        childDepth,
        context,
        { 'explicitGroupRules': childExplicit, 'sort': childSort }
      );

      childNode.value = group.nodeValue;
      childNode.property = currentRule.property;

      if (node.grouped !== null) {
        node.grouped.push(childNode);
      }
    }

    if (node.grouped !== null && node.grouped.length > 0) {
      sortEngine.sortChildren(
        node.grouped,
        sort,
        (n) => { const result = this.getGroupCount(n);
          return result; }
      );
    } else {
      node.grouped = null;
    }

    if (ungroupable.length > 0) {
      if (hasGroupOutliers) {
        const outlierNode: GroupNodeInterface = {
          'grouped': null,
          'property': null,
          'ungrouped': ungroupable,
          'value': { 'outliers': true }
        };

        sortEngine.sortNodes(ungroupable, sort);
        node.grouped ??= [];
        node.grouped.push(outlierNode);
      } else {
        node.ungrouped = ungroupable;
        sortEngine.sortNodes(node.ungrouped, sort);
      }
    }

    return node;
  }

  private resolveGroupRule(
    data: DataRecordInterface[],
    propertyOrder: string[],
    depth: number,
    explicitGroupRules: GroupRuleInterface[] | undefined,
    context: EngineContextEntity.Type
  ): { 'rule': GroupRuleInterface, 'wasExplicit': boolean } | null {
    // EXPLICIT path: explicit rule at this depth takes priority.
    if (explicitGroupRules !== undefined) {
      const rule = explicitGroupRules[depth];

      if (rule !== undefined) {
        return { 'rule': rule, 'wasExplicit': true };
      }
    }

    // AUTO path: consume the next property from the ordered list.
    if (propertyOrder.length === 0) {
      return null;
    }

    const property = propertyOrder[0];

    if (property === undefined) {
      return null;
    }

    const options: DiscoverValuesOptionsEntity.Type = {};

    if (context.granularity !== undefined) {
      options.granularity = context.granularity;
    }

    const values = valueDiscoveryEngine.discoverValues(data, property, options);

    if (values.length === 0) {
      return null;
    }

    return {
      'rule': { 'property': property, 'values': values },
      'wasExplicit': false
    };
  }

  private makeLeaf(data: DataRecordInterface[], sort: SortRuleEntity.Type[] | undefined): GroupNodeInterface {
    if (sort !== undefined && sort.length > 0 && data.length > 1) {
      sortEngine.sortNodes(data, sort);
    }

    return {
      'grouped': null,
      'property': null,
      'ungrouped': data,
      'value': null
    };
  }

  private getGroupCount(node: GroupNodeInterface): number {
    const cached = this.groupCountCache.get(node);

    if (cached !== undefined) {
      return cached;
    }

    let count = node.ungrouped?.length ?? 0;

    if (node.grouped !== null) {
      const children = node.grouped;

      for (let index = 0; index < children.length; index++) {
        count += this.getGroupCount(children[index]!);
      }
    }

    this.groupCountCache.set(node, count);

    return count;
  }
}
