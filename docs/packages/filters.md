---
title: '@studnicky/filters'
description: Composable declarative filtering primitives.
---

# @studnicky/filters

`@studnicky/filters` composes declarative conditions from independently reusable comparators, operators, logic gates, modes, value contracts, and plugins. Configuration values use JSON-safe entity contracts. Evaluation operands may retain native `Date`, `Map`, or `Set` values after validation with `RuntimeValue` from `@studnicky/types/node`. It depends on `@studnicky/types` for reusable runtime narrowing and emits structured `BaseError` children for package-owned failures.

## Northstar Books catalogue policy

Northstar Books keeps one declarative sellability rule for its storefront, catalogue exports, and reservation jobs: a title must be published and have available inventory. `FilterEngine` evaluates that shared rule against every catalogue record, so each consumer applies the same admission decision. When a shopper enters an approximate title, matching plugins from `@studnicky/filters/matching` turn a text-similarity threshold into another declared condition rather than a second ad-hoc search path.

The guarantee is explicit: JSON-safe filter configuration is validated at the boundary, and every evaluation uses the same condition tree and registered operators. The matching entrypoint validates its filter values before it delegates scoring to `@studnicky/matching/browser`; it does not make fuzzy matching an implicit global policy.

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
| `DateRangeBoundEntity` | Defines a JSON-safe date range bound. | `@studnicky/filters/entities` |
| `RuntimeValue` | Validates runtime operands without converting native `Date`, `Map`, or `Set` values. | `@studnicky/types/node` |
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
| `DateRangeEntity` | Defines declarative JSON-safe date range boundaries. | `@studnicky/filters/entities` |
| `NumericRangeEntity` | Defines declarative numeric range boundaries. | `@studnicky/filters/entities` |
| `TimeRangeEntity` | Defines declarative string-based time range boundaries. | `@studnicky/filters/entities` |
| `BasePluginInterface` | Defines the base plugin contract. | `@studnicky/filters/interfaces` |
| `PluginContextInterface` | Defines the context passed to one plugin operation. | `@studnicky/filters/interfaces` |
| `TimeOperatorsPlugin` | Supplies time-aware filter operators. | `@studnicky/filters/node` |

## Matching plugins

The `@studnicky/filters/matching` entrypoint provides browser-safe adapters that validate untrusted filter values, delegate scoring to `@studnicky/matching/browser`, and register one filter operation per plugin.

<RunnableExample src="packages/filters/examples/fuzzyFilter" title="Fuzzy title filter with a matching plugin" />

| Symbol | Purpose | Import path |
|---|---|---|
| `CosineAtLeastPlugin` | `COSINE_AT_LEAST` | `@studnicky/filters/matching` |
| `DamerauLevenshteinAtLeastPlugin` | `DAMERAU_LEVENSHTEIN_AT_LEAST` | `@studnicky/filters/matching` |
| `JaccardAtLeastPlugin` | `JACCARD_AT_LEAST` | `@studnicky/filters/matching` |
| `JaroAtLeastPlugin` | `JARO_AT_LEAST` | `@studnicky/filters/matching` |
| `JaroWinklerAtLeastPlugin` | `JARO_WINKLER_AT_LEAST` | `@studnicky/filters/matching` |
| `LevenshteinAtLeastPlugin` | `LEVENSHTEIN_AT_LEAST` | `@studnicky/filters/matching` |
| `NgramAtLeastPlugin` | `NGRAM_AT_LEAST` | `@studnicky/filters/matching` |
| `SorensenDiceAtLeastPlugin` | `SORENSEN_DICE_AT_LEAST` | `@studnicky/filters/matching` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/filters)
