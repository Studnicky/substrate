---
title: '@studnicky/drilldown'
description: Deterministic multi-level grouping, faceting, and sorting engine that discovers filterable/groupable properties from arbitrary record data.
---

# @studnicky/drilldown

> Deterministic multi-level grouping, faceting, and sorting for arbitrary record data, with automatic property discovery and explicit rule-driven grouping.

## Install

```bash
pnpm add @studnicky/drilldown
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Overview

`DrillDown.group` builds a hierarchical grouping tree from an array of records, either from explicit `GroupRuleInterface` rules (alphabetic, range, date, semver, CIDR, sequential, or string matchers) or from `DataAnalyzer`-recommended properties. `FacetedDiscovery` narrows a record set by concurrently-selectable facet dimensions. `DrilldownRulesEntity` and `DrillDownConfigEntity` are self-referential, schema-validated rule trees that can nest per-value grouping rules to unbounded depth.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `DrillDown` | Builds a hierarchical grouping tree from records, via explicit rules or auto-discovered properties. | `@studnicky/drilldown` |
| `DataAnalyzer` | Discovers groupable properties across a dataset and recommends a grouping order. | `@studnicky/drilldown` |
| `FacetedDiscovery` | Narrows a record set by concurrently-selectable, mutually-consistent facet dimensions. | `@studnicky/drilldown` |
| `ruleValidator` | Validates a `DrilldownRulesEntity.Type` tree, reporting structural errors by path. | `@studnicky/drilldown` |
| `DrillDownConfigEntity` | Top-level schema-derived entity binding filter, group, and sort rules for one `DrillDown.group` call. | `@studnicky/drilldown` |
| `DrilldownRulesEntity` | Self-referential, schema-validated rule tree (filter/group/sort), nestable per group value to unbounded depth. | `@studnicky/drilldown` |
| `AlphabeticRangeEntity` | Schema-derived alphabetic (lexicographic) range for string grouping. | `@studnicky/drilldown` |
| `AutoGroupingConfigEntity` | Configuration for automatic rule generation from discovered property values. | `@studnicky/drilldown` |
| `CidrRangeEntity` | Schema-derived IPv4 CIDR block range for IP address grouping. | `@studnicky/drilldown` |
| `DateGranularityValueEntity` | Schema-derived temporal granularity value (`day`/`week`/`month`/`quarter`/`year`). | `@studnicky/drilldown` |
| `DateRangeEntity` | Schema-derived inclusive-after/exclusive-before epoch-ms date range. | `@studnicky/drilldown` |
| `DateRangeFilterRuleEntity` | Schema-derived filter rule matching a property against a date range. | `@studnicky/drilldown` |
| `DiscoverValuesOptionsEntity` | Options controlling automatic value discovery during grouping. | `@studnicky/drilldown` |
| `DiscoveryStrategyEntity` | Schema-derived enum of value-discovery strategies (`alphabetic`/`distributive`/`quantile`/`sequential`). | `@studnicky/drilldown` |
| `FilterOperatorEntity` | Schema-derived enum of comparison operators for value filter rules. | `@studnicky/drilldown` |
| `FilterRuleEntity` | Schema-derived union of date-range, numeric-range, and value filter rules. | `@studnicky/drilldown` |
| `GranularityOptionsEntity` | Options controlling automatic date-granularity selection. | `@studnicky/drilldown` |
| `GroupingOptionsEntity` | Options controlling automatic property discovery and grouping, including property exclusions. | `@studnicky/drilldown` |
| `GroupNodeValueEntity` | Schema-derived value carried by a grouping tree node (the value the node's records share). | `@studnicky/drilldown` |
| `GroupSortPropertyEntity` | Schema-derived enum of properties a group level can be sorted by. | `@studnicky/drilldown` |
| `GroupValueDiscriminantEntity` | Schema-derived discriminant identifying which matcher/group-value variant a value is. | `@studnicky/drilldown` |
| `JsonPropertyTypeEntity` | Schema-derived runtime data-type classification for a discovered property's values. | `@studnicky/drilldown` |
| `NumericRangeFilterRuleEntity` | Schema-derived filter rule matching a property against a numeric range. | `@studnicky/drilldown` |
| `OutlierMarkerEntity` | Schema-derived marker identifying an outlier group produced during grouping. | `@studnicky/drilldown` |
| `PathSegmentEntity` | Schema-derived single segment (property + value) in a path from the tree root to a node. | `@studnicky/drilldown` |
| `ProcessOptionsEntity` | Options controlling a single `DrillDown.group` invocation end to end. | `@studnicky/drilldown` |
| `PropertyBoundsEntity` | Schema-derived minimum/maximum bounds computed for a numeric or date property. | `@studnicky/drilldown` |
| `PropertyOrderEntity` | Schema-derived ordered list of property paths for progressive multi-level grouping. | `@studnicky/drilldown` |
| `PropertyPathEntity` | Schema-derived dot-delimited path identifying a discoverable property on a record. | `@studnicky/drilldown` |
| `RangeEntity` | Schema-derived inclusive-minimum/exclusive-maximum numeric range. | `@studnicky/drilldown` |
| `RangeIndicesEntity` | Schema-derived start/end indices identifying a numeric group's position. | `@studnicky/drilldown` |
| `SemverRangeEntity` | Schema-derived semantic-version range expressed as a caret/tilde/comparator string. | `@studnicky/drilldown` |
| `SequentialRangeEntity` | Schema-derived prefix/suffix/padding window for sequentially-numbered string values. | `@studnicky/drilldown` |
| `SortDirectionEntity` | Schema-derived enum of sort directions (`asc`/`desc`). | `@studnicky/drilldown` |
| `SortRuleEntity` | Schema-derived rule sorting group values by a named property and direction. | `@studnicky/drilldown` |
| `ValueFilterRuleEntity` | Schema-derived filter rule matching a property against an explicit value list. | `@studnicky/drilldown` |
| `DateGranularity` | Temporal granularity levels for grouping date values. | `@studnicky/drilldown` |
| `GroupingStrategy` | Strategies for partitioning numeric data into groups (`distributive`/`quantile`). | `@studnicky/drilldown` |
| `PropertyType` | Enumeration of value-shape classifications used by automatic value discovery. | `@studnicky/drilldown` |
| `DataAnalyzerInterface` | Contract for discovering groupable properties and recommending a grouping order. | `@studnicky/drilldown` |
| `DrillDownInterface` | Contract for building a grouping tree from records and rules. | `@studnicky/drilldown` |
| `MatcherHandlerInterface` | Contract implemented by each matcher type: create, validate, compare, and match group values. | `@studnicky/drilldown` |
| `AlphabeticGroupValueInterface` | Alphabetic-range group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `CidrGroupValueInterface` | CIDR-range group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `DateGroupValueInterface` | Date-range group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `GroupRuleInterface` | Explicit grouping rule: a property and its ordered list of group value variants. | `@studnicky/drilldown` |
| `RangeGroupValueInterface` | Numeric-range group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `SemverGroupValueInterface` | Semver-range group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `SequentialGroupValueInterface` | Sequential-pattern group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `StringGroupValueInterface` | Exact-match string group value, with an optional nested rules tree for per-value grouping. | `@studnicky/drilldown` |
| `AlphabeticMatcherInterface` | Matcher for alphabetic range membership. | `@studnicky/drilldown` |
| `AnalysisResultInterface` | Complete analysis output for a dataset: discovered properties and a recommended grouping order. | `@studnicky/drilldown` |
| `CidrMatcherInterface` | Matcher for IP address CIDR block membership. | `@studnicky/drilldown` |
| `DataRecordInterface` | Arbitrary record shape `DrillDown`/`DataAnalyzer` operate on. | `@studnicky/drilldown` |
| `DateMatcherInterface` | Matcher for date/time range membership. | `@studnicky/drilldown` |
| `DrillDownAnalysisInterface` | Analysis the `DrillDown` engine uses to choose an automatic grouping order. | `@studnicky/drilldown` |
| `GroupNodeInterface` | Tree node in the hierarchical grouping structure. | `@studnicky/drilldown` |
| `MatchContextInterface` | Context providing type-conversion utilities for matching operations. | `@studnicky/drilldown` |
| `NodePathIndexInterface` | Bidirectional index for efficient node lookup in the grouping tree. | `@studnicky/drilldown` |
| `PartitionGroupInterface` | One partitioned group of matched nodes and their shared group value. | `@studnicky/drilldown` |
| `PropertyInfoInterface` | Statistical profile of a single property across all records. | `@studnicky/drilldown` |
| `RangeMatcherInterface` | Matcher for numeric range membership. | `@studnicky/drilldown` |
| `SemverMatcherInterface` | Matcher for semantic version constraint satisfaction. | `@studnicky/drilldown` |
| `SequentialMatcherInterface` | Matcher for sequential string patterns. | `@studnicky/drilldown` |
| `StringMatcherInterface` | Matcher for exact string equality. | `@studnicky/drilldown` |
| `FacetAccessorMapType` | Accessor map reading one filterable string value per facet dimension from an arbitrary row shape. | `@studnicky/drilldown` |
| `FacetFilterStateType` | Current faceted-drilldown selection per dimension. | `@studnicky/drilldown` |
| `GroupValueUnionType` | Union of all group-value shapes usable in a `GroupRuleInterface`. | `@studnicky/drilldown` |
| `MatcherUnionType` | Union of all matcher shapes produced by `matcherRegistry`. | `@studnicky/drilldown` |
