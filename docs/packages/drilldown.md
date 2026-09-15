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

`DrillDown.group` builds a hierarchical grouping tree from an array of records, either from explicit `DrilldownRulesEntity.GroupRuleEntity.Type` rules (alphabetic, range, date, semver, CIDR, sequential, or string matchers) or from `DataAnalyzer`-recommended properties. `FacetedDiscovery` narrows a record set by concurrently-selectable facet dimensions. `DrilldownRulesEntity` and `DrillDownConfigEntity` are self-referential, schema-validated rule trees that can nest per-value grouping rules to unbounded depth.

## Usage

`propertyPriority` fixes the drilldown order explicitly — each entry adds one level to the tree:

<<< ../../packages/drilldown/examples/basic-drilldown.ts#usage

## Explicit rule types

Import `DrilldownRulesEntity` from `@studnicky/drilldown/entities` when application code constructs reusable grouping rules. Its nested entity types represent each supported matcher branch.

<<< ../../packages/drilldown/examples/basic-drilldown.ts#explicit-rule-types

## Try it

<RunnableExample src="packages/drilldown/examples/basic-drilldown" title="Multi-level grouping by propertyPriority" />

## Live demo

A synthetic dataset of orders, generated fresh each time with `@faker-js/faker`, drilled down four levels deep (`region → category → status → brand`) to demonstrate the module's core promise: recursion bounded only by how many properties are discoverable in the data, not by a fixed depth. Click a node to expand or collapse its children.

<DrilldownTreeDemo />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `DrillDown` | Builds a hierarchical grouping tree from records, via explicit rules or auto-discovered properties. | `@studnicky/drilldown/node` |
| `DataAnalyzer` | Discovers groupable properties across a dataset and recommends a grouping order. | `@studnicky/drilldown/node` |
| `FacetedDiscovery` | Narrows a record set by concurrently-selectable, mutually-consistent facet dimensions. | `@studnicky/drilldown/node` |
| `ruleValidator` | Validates a `DrilldownRulesEntity.Type` tree, reporting structural errors by path. | `@studnicky/drilldown/node` |
| `DrillDownConfigEntity` | Top-level schema-derived entity binding filter, group, and sort rules for one `DrillDown.group` call. | `@studnicky/drilldown/entities` |
| `DrilldownRulesEntity` | Self-referential, schema-validated rule tree (filter/group/sort), nestable per group value to unbounded depth. Its named group-value and group-rule entities define the accepted configuration variants. | `@studnicky/drilldown/entities` |
| `AlphabeticRangeEntity` | Schema-derived alphabetic (lexicographic) range for string grouping. | `@studnicky/drilldown/entities` |
| `AutoGroupingConfigEntity` | Configuration for automatic rule generation from discovered property values. | `@studnicky/drilldown/entities` |
| `CidrRangeEntity` | Schema-derived IPv4 CIDR block range for IP address grouping. | `@studnicky/drilldown/entities` |
| `DateGranularityValueEntity` | Schema-derived temporal granularity value (`day`/`week`/`month`/`quarter`/`year`). | `@studnicky/drilldown/entities` |
| `DateRangeEntity` | Schema-derived inclusive-after/exclusive-before epoch-ms date range. | `@studnicky/drilldown/entities` |
| `DateRangeFilterRuleEntity` | Schema-derived filter rule matching a property against a date range. | `@studnicky/drilldown/entities` |
| `DiscoverValuesOptionsEntity` | Options controlling automatic value discovery during grouping. | `@studnicky/drilldown/entities` |
| `DiscoveryStrategyEntity` | Schema-derived enum of value-discovery strategies (`alphabetic`/`distributive`/`quantile`/`sequential`). | `@studnicky/drilldown/entities` |
| `FilterOperatorEntity` | Schema-derived enum of comparison operators for value filter rules. | `@studnicky/drilldown/entities` |
| `FilterRuleEntity` | Schema-derived union of date-range, numeric-range, and value filter rules. | `@studnicky/drilldown/entities` |
| `GranularityOptionsEntity` | Options controlling automatic date-granularity selection. | `@studnicky/drilldown/entities` |
| `GroupingOptionsEntity` | Options controlling automatic property discovery and grouping, including property exclusions. | `@studnicky/drilldown/entities` |
| `GroupNodeValueEntity` | Schema-derived value carried by a grouping tree node (the value the node's records share). | `@studnicky/drilldown/entities` |
| `GroupSortPropertyEntity` | Schema-derived enum of properties a group level can be sorted by. | `@studnicky/drilldown/entities` |
| `GroupValueDiscriminantEntity` | Schema-derived discriminant identifying which matcher/group-value variant a value is. | `@studnicky/drilldown/entities` |
| `JsonPropertyTypeEntity` | Schema-derived runtime data-type classification for a discovered property's values. | `@studnicky/drilldown/entities` |
| `NumericRangeFilterRuleEntity` | Schema-derived filter rule matching a property against a numeric range. | `@studnicky/drilldown/entities` |
| `OutlierMarkerEntity` | Schema-derived marker identifying an outlier group produced during grouping. | `@studnicky/drilldown/entities` |
| `PathSegmentEntity` | Schema-derived single segment (property + value) in a path from the tree root to a node. | `@studnicky/drilldown/entities` |
| `ProcessOptionsEntity` | Options controlling a single `DrillDown.group` invocation end to end. | `@studnicky/drilldown/entities` |
| `PropertyBoundsEntity` | Schema-derived minimum/maximum bounds computed for a numeric or date property. | `@studnicky/drilldown/entities` |
| `PropertyOrderEntity` | Schema-derived ordered list of property paths for progressive multi-level grouping. | `@studnicky/drilldown/entities` |
| `PropertyPathEntity` | Schema-derived dot-delimited path identifying a discoverable property on a record. | `@studnicky/drilldown/entities` |
| `RangeEntity` | Schema-derived inclusive-minimum/exclusive-maximum numeric range. | `@studnicky/drilldown/entities` |
| `RangeIndicesEntity` | Schema-derived start/end indices identifying a numeric group's position. | `@studnicky/drilldown/entities` |
| `SemverRangeEntity` | Schema-derived semantic-version range expressed as a caret/tilde/comparator string. | `@studnicky/drilldown/entities` |
| `SequentialRangeEntity` | Schema-derived prefix/suffix/padding window for sequentially-numbered string values. | `@studnicky/drilldown/entities` |
| `SortDirectionEntity` | Schema-derived enum of sort directions (`asc`/`desc`). | `@studnicky/drilldown/entities` |
| `SortRuleEntity` | Schema-derived rule sorting group values by a named property and direction. | `@studnicky/drilldown/entities` |
| `ValueFilterRuleEntity` | Schema-derived filter rule matching a property against an explicit value list. | `@studnicky/drilldown/entities` |
| `DateGranularity` | Temporal granularity levels for grouping date values. | `@studnicky/drilldown/node` |
| `GroupingStrategy` | Strategies for partitioning numeric data into groups (`distributive`/`quantile`). | `@studnicky/drilldown/node` |
| `PropertyType` | Enumeration of value-shape classifications used by automatic value discovery. | `@studnicky/drilldown/node` |
| `DataAnalyzerInterface` | Contract for discovering groupable properties and recommending a grouping order. | `@studnicky/drilldown/interfaces` |
| `DrillDownInterface` | Contract for building a grouping tree from records and rules. | `@studnicky/drilldown/interfaces` |
| `MatcherHandlerInterface` | Contract implemented by each matcher type: create, validate, compare, and match group values. | `@studnicky/drilldown/interfaces` |
| `AlphabeticMatcherInterface` | Matcher for alphabetic range membership. | `@studnicky/drilldown/interfaces` |
| `AnalysisResultInterface` | Complete analysis output for a dataset: discovered properties and a recommended grouping order. | `@studnicky/drilldown/interfaces` |
| `CidrMatcherInterface` | Matcher for IP address CIDR block membership. | `@studnicky/drilldown/interfaces` |
| `DateMatcherInterface` | Matcher for date/time range membership. | `@studnicky/drilldown/interfaces` |
| `DrillDownAnalysisInterface` | Analysis the `DrillDown` engine uses to choose an automatic grouping order. | `@studnicky/drilldown/interfaces` |
| `GroupNodeInterface` | Tree node in the hierarchical grouping structure. | `@studnicky/drilldown/interfaces` |
| `MatchContextInterface` | Context providing type-conversion utilities for matching operations. | `@studnicky/drilldown/interfaces` |
| `NodePathIndexInterface` | Bidirectional index for efficient node lookup in the grouping tree. | `@studnicky/drilldown/interfaces` |
| `PartitionGroupInterface` | One partitioned group of matched nodes and their shared group value. | `@studnicky/drilldown/interfaces` |
| `PropertyInfoInterface` | Statistical profile of a single property across all records. | `@studnicky/drilldown/interfaces` |
| `RangeMatcherInterface` | Matcher for numeric range membership. | `@studnicky/drilldown/interfaces` |
| `SemverMatcherInterface` | Matcher for semantic version constraint satisfaction. | `@studnicky/drilldown/interfaces` |
| `SequentialMatcherInterface` | Matcher for sequential string patterns. | `@studnicky/drilldown/interfaces` |
| `StringMatcherInterface` | Matcher for exact string equality. | `@studnicky/drilldown/interfaces` |
| `FacetAccessorMapType` | Accessor map reading one filterable string value per facet dimension from an arbitrary row shape. | `@studnicky/drilldown/types` |
| `FacetFilterStateType` | Current faceted-drilldown selection per dimension. | `@studnicky/drilldown/types` |
| `MatcherUnionType` | Union of all matcher shapes produced by `matcherRegistry`. | `@studnicky/drilldown/types` |
