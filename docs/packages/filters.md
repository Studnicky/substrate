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

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `FilterEngine` | Evaluates a declarative condition tree against a value. | `@studnicky/filters` |
| `FilterValueEntity` | Defines the JSON-safe filter value contract. | `@studnicky/filters` |
| `FilterValueGuard` | Normalizes an unknown value at the filter-value boundary. | `@studnicky/filters` |
| `Plugin` | Adds one independently scoped filter capability. | `@studnicky/filters` |
| `FilterError` | Base error for filter-owned failures. | `@studnicky/filters` |
| `FilterConfigurationError` | Reports invalid filter configuration. | `@studnicky/filters` |
| `FilterOperatorError` | Reports invalid operator evaluation. | `@studnicky/filters` |
| `DefaultConfig` | Supplies the package default filter configuration. | `@studnicky/filters` |
| `ArrayLogic` | Names collection comparison logic. | `@studnicky/filters` |
| `Comparator` | Names the built-in comparison operations. | `@studnicky/filters` |
| `ConditionType` | Names declarative condition node types. | `@studnicky/filters` |
| `ErrorCodes` | Names package error codes. | `@studnicky/filters` |
| `ErrorCollectionMode` | Selects filter error collection behavior. | `@studnicky/filters` |
| `FilterMode` | Names filter evaluation modes. | `@studnicky/filters` |
| `LogicGate` | Names logical gate operations. | `@studnicky/filters` |
| `Operator` | Names the built-in operator functions. | `@studnicky/filters` |
| `PropertyName` | Names declarative condition properties. | `@studnicky/filters` |
| `FilterCompilationError` | Reports compilation failures. | `@studnicky/filters` |
| `FilterEvaluationError` | Reports evaluation failures. | `@studnicky/filters` |
| `FilterGateError` | Reports invalid logical gates. | `@studnicky/filters` |
| `PluginError` | Reports plugin registration and execution failures. | `@studnicky/filters` |
| `RegexError` | Reports regular-expression validation and execution failures. | `@studnicky/filters` |
| `GroupGateNamesEntity` | Defines valid named group gates. | `@studnicky/filters` |
| `DateRangeInterface` | Defines declarative date range boundaries. | `@studnicky/filters` |
| `NumericRangeInterface` | Defines declarative numeric range boundaries. | `@studnicky/filters` |
| `RangeInterface` | Defines a generic range boundary pair. | `@studnicky/filters` |
| `TimeRangeInterface` | Defines declarative time range boundaries. | `@studnicky/filters` |
| `BasePluginInterface` | Defines the base plugin contract. | `@studnicky/filters` |
| `PluginContextInterface` | Defines the context passed to one plugin operation. | `@studnicky/filters` |
| `TimeOperatorsPlugin` | Supplies time-aware filter operators. | `@studnicky/filters` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/filters)
