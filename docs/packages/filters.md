---
title: '@studnicky/filters'
description: Composable declarative filtering primitives.
---

# @studnicky/filters

`@studnicky/filters` composes declarative conditions from independently reusable comparators, operators, logic gates, modes, value contracts, and plugins. It depends on `@studnicky/types` only for generic narrowing primitives and emits structured `BaseError` children for package-owned failures.

## Install

```bash
pnpm add @studnicky/filters
```

## Try it

Build an `AND` filter for active products with inventory, then evaluate a matching and non-matching record.

<RunnableExample src="packages/filters/examples/filterProducts" title="Filter active products with inventory" />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `FilterEngine` | Evaluates a declarative condition tree against a value. | `@studnicky/filters/node` |
| `FilterValueEntity` | Defines the JSON-safe filter value contract. | `@studnicky/filters/entities` |
| `FilterValueGuard` | Normalizes an unknown value at the filter-value boundary. | `@studnicky/filters/node` |
| `Plugin` | Adds one independently scoped filter capability. | `@studnicky/filters/node` |
| `FilterError` | Base error for filter-owned failures. | `@studnicky/filters/node` |
| `FilterConfigurationError` | Reports invalid filter configuration. | `@studnicky/filters/node` |
| `FilterOperatorError` | Reports invalid operator evaluation. | `@studnicky/filters/node` |
| `DefaultConfig` | Supplies the package default filter configuration. | `@studnicky/filters/node` |
| `ArrayLogic` | Names collection comparison logic. | `@studnicky/filters/node` |
| `Comparator` | Names the built-in comparison operations. | `@studnicky/filters/node` |
| `ConditionType` | Names declarative condition node types. | `@studnicky/filters/node` |
| `ErrorCodes` | Names package error codes. | `@studnicky/filters/node` |
| `ErrorCollectionMode` | Selects filter error collection behavior. | `@studnicky/filters/node` |
| `FilterMode` | Names filter evaluation modes. | `@studnicky/filters/node` |
| `LogicGate` | Names logical gate operations. | `@studnicky/filters/node` |
| `Operator` | Names the built-in operator functions. | `@studnicky/filters/node` |
| `PropertyName` | Names declarative condition properties. | `@studnicky/filters/node` |
| `FilterCompilationError` | Reports compilation failures. | `@studnicky/filters/node` |
| `FilterEvaluationError` | Reports evaluation failures. | `@studnicky/filters/node` |
| `FilterGateError` | Reports invalid logical gates. | `@studnicky/filters/node` |
| `PluginError` | Reports plugin registration and execution failures. | `@studnicky/filters/node` |
| `RegexError` | Reports regular-expression validation and execution failures. | `@studnicky/filters/node` |
| `GroupGateNamesEntity` | Defines valid named group gates. | `@studnicky/filters/entities` |
| `DateRangeInterface` | Defines declarative date range boundaries. | `@studnicky/filters/interfaces` |
| `NumericRangeInterface` | Defines declarative numeric range boundaries. | `@studnicky/filters/interfaces` |
| `RangeInterface` | Defines a generic range boundary pair. | `@studnicky/filters/interfaces` |
| `TimeRangeInterface` | Defines declarative time range boundaries. | `@studnicky/filters/interfaces` |
| `BasePluginInterface` | Defines the base plugin contract. | `@studnicky/filters/interfaces` |
| `PluginContextInterface` | Defines the context passed to one plugin operation. | `@studnicky/filters/interfaces` |
| `TimeOperatorsPlugin` | Supplies time-aware filter operators. | `@studnicky/filters/node` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/filters)
