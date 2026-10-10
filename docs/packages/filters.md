---
title: "@studnicky/filters"
description: Composable declarative filtering primitives.
---

# @studnicky/filters

`@studnicky/filters` composes declarative conditions from independently reusable comparators, operators, logic gates, modes, value contracts, and plugins. Configuration values use JSON-safe entity contracts. Evaluation operands may retain native `Date`, `Map`, or `Set` values after validation with `RuntimeValue` from `@studnicky/types/node`. It depends on `@studnicky/types` for reusable runtime narrowing and emits structured `BaseError` children for package-owned failures.

## What it is

A composable declarative filtering primitive: it evaluates caller-owned condition trees with reusable operators, facets, and opt-in matching plugins. It does not define a catalogue, a search product, or the policies that decide which records exist.

## What it is for

Northstar Books uses it to apply the same sellability and discovery rules in its storefront, catalogue export, and reservation workers. Consumers provide record shapes, condition trees, and plugin choices; the package supplies the validated evaluation building blocks.

## Northstar Books examples

The runnable active-products example evaluates published and in-stock catalogue records against one shared condition tree, proving that a storefront and reservation job can make the same admission decision. The runnable fuzzy-title example adds one selected matching plugin to a declared title condition, proving that approximate book discovery remains explicit configuration rather than hidden search policy.

## Public entrypoints

| Import path                       | Use it when                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `@studnicky/filters/node`         | Northstar Books evaluates declarative catalogue or reservation conditions on the server. |
| `@studnicky/filters/browser`      | A storefront evaluates the same portable filter contract in the browser.                 |
| `@studnicky/filters/interfaces`   | TypeScript composition shares filter and plugin contracts.                               |
| `@studnicky/filters/matching`     | A consumer adds an explicit fuzzy-title matching operation to a filter.                  |
| `@studnicky/filters/entities`     | An adapter validates JSON-safe filter values, ranges, and configuration.                 |
| `@studnicky/filters/facets`       | A consumer composes reusable facet-based catalogue conditions.                           |
| `@studnicky/filters/facets/types` | TypeScript code shares the facet contracts used by those conditions.                     |

## Northstar Books catalogue policy

Northstar Books keeps one declarative sellability rule for its storefront, catalogue exports, and reservation jobs: a title must be published and have available inventory. `FilterEngine` evaluates that shared rule against every catalogue record, so each consumer applies the same admission decision. When a shopper enters an approximate title, matching plugins from `@studnicky/filters/matching` turn a text-similarity threshold into another declared condition rather than a second ad-hoc search path.

The guarantee is explicit: JSON-safe filter configuration is validated at the boundary, and every evaluation uses the same condition tree and registered operators. The matching entrypoint validates its filter values before it delegates scoring to `@studnicky/matching` through the `#runtime` conditional subpath import, which Node resolves to the `node` or `browser` export condition rather than to which `@studnicky/filters` entrypoint the consumer imported; it does not make fuzzy matching an implicit global policy.

## Install

```bash
pnpm add @studnicky/filters
```

## Try it

Northstar Books runs the same sellability check in three places — the storefront, the catalogue export, and the reservation worker — and all three need to reach the exact same verdict on a given title. The example below builds one declarative `AND` condition tree once: a book must be listed and have at least one copy in stock. It then runs that single rule against two records, a title with eight copies on the shelf and one that's sold out, to show the engine admitting the first and rejecting the second without any consumer writing its own ad-hoc check.

<RunnableExample src="packages/filters/examples/filterProducts" title="Filter active products with inventory" />

## Exports

| Symbol                     | Purpose                                                                              | Import path                     |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| `FilterEngine`             | Evaluates a declarative condition tree against a value.                              | `@studnicky/filters/node`       |
| `FilterValueEntity`        | Defines the JSON-safe filter value contract.                                         | `@studnicky/filters/entities`   |
| `DateRangeBoundEntity`     | Defines a JSON-safe date range bound.                                                | `@studnicky/filters/entities`   |
| `RuntimeValue`             | Validates runtime operands without converting native `Date`, `Map`, or `Set` values. | `@studnicky/types/node`         |
| `Plugin`                   | Adds one independently scoped filter capability.                                     | `@studnicky/filters/node`       |
| `FilterError`              | Base error for filter-owned failures.                                                | `@studnicky/filters/node`       |
| `FilterConfigurationError` | Reports invalid filter configuration.                                                | `@studnicky/filters/node`       |
| `FilterOperatorError`      | Reports invalid operator evaluation.                                                 | `@studnicky/filters/node`       |
| `DefaultConfig`            | Supplies the package default filter configuration.                                   | `@studnicky/filters/node`       |
| `ArrayLogic`               | Names collection comparison logic.                                                   | `@studnicky/filters/node`       |
| `Comparator`               | Names the built-in comparison operations.                                            | `@studnicky/filters/node`       |
| `ConditionType`            | Names declarative condition node types.                                              | `@studnicky/filters/node`       |
| `ErrorCodes`               | Names package error codes.                                                           | `@studnicky/filters/node`       |
| `ErrorCollectionMode`      | Selects filter error collection behavior.                                            | `@studnicky/filters/node`       |
| `FilterMode`               | Names filter evaluation modes.                                                       | `@studnicky/filters/node`       |
| `LogicGate`                | Names logical gate operations.                                                       | `@studnicky/filters/node`       |
| `Operator`                 | Names the built-in operator functions.                                               | `@studnicky/filters/node`       |
| `PropertyName`             | Names declarative condition properties.                                              | `@studnicky/filters/node`       |
| `FilterCompilationError`   | Reports compilation failures.                                                        | `@studnicky/filters/node`       |
| `FilterEvaluationError`    | Reports evaluation failures.                                                         | `@studnicky/filters/node`       |
| `FilterGateError`          | Reports invalid logical gates.                                                       | `@studnicky/filters/node`       |
| `PluginError`              | Reports plugin registration and execution failures.                                  | `@studnicky/filters/node`       |
| `RegexError`               | Reports regular-expression validation and execution failures.                        | `@studnicky/filters/node`       |
| `GroupGateNamesEntity`     | Defines valid named group gates.                                                     | `@studnicky/filters/entities`   |
| `DateRangeEntity`          | Defines declarative JSON-safe date range boundaries.                                 | `@studnicky/filters/entities`   |
| `NumericRangeEntity`       | Defines declarative numeric range boundaries.                                        | `@studnicky/filters/entities`   |
| `TimeRangeEntity`          | Defines declarative string-based time range boundaries.                              | `@studnicky/filters/entities`   |
| `BasePluginInterface`      | Defines the base plugin contract.                                                    | `@studnicky/filters/interfaces` |
| `PluginContextInterface`   | Defines the context passed to one plugin operation.                                  | `@studnicky/filters/interfaces` |
| `TimeOperatorsPlugin`      | Supplies time-aware filter operators.                                                | `@studnicky/filters/node`       |

## Matching plugins

A shopper searching for "The Dispossessed" who types "The Dispossed" should still find it — but a search for an unrelated book shouldn't quietly slip through on a loose match either. Rather than bolting on a separate fuzzy-search code path, this example adds `LevenshteinAtLeastPlugin` straight into the same filter engine as one more declared condition on the title field. The plugin validates the filter values before delegating the actual scoring to `@studnicky/matching` via the package's `#runtime` conditional export — resolved to `@studnicky/matching/node` or `@studnicky/matching/browser` by Node's export-condition resolution, not by the `@studnicky/filters` entrypoint the consumer imported — so the example can confirm the near-miss spelling passes at an 0.8 similarity threshold while a genuinely different title, "A Wizard of Earthsea", does not.

<RunnableExample src="packages/filters/examples/fuzzyFilter" title="Fuzzy title filter with a matching plugin" />

| Symbol                            | Purpose                        | Import path                   |
| --------------------------------- | ------------------------------ | ----------------------------- |
| `CosineAtLeastPlugin`             | `COSINE_AT_LEAST`              | `@studnicky/filters/matching` |
| `DamerauLevenshteinAtLeastPlugin` | `DAMERAU_LEVENSHTEIN_AT_LEAST` | `@studnicky/filters/matching` |
| `JaccardAtLeastPlugin`            | `JACCARD_AT_LEAST`             | `@studnicky/filters/matching` |
| `JaroAtLeastPlugin`               | `JARO_AT_LEAST`                | `@studnicky/filters/matching` |
| `JaroWinklerAtLeastPlugin`        | `JARO_WINKLER_AT_LEAST`        | `@studnicky/filters/matching` |
| `LevenshteinAtLeastPlugin`        | `LEVENSHTEIN_AT_LEAST`         | `@studnicky/filters/matching` |
| `NgramAtLeastPlugin`              | `NGRAM_AT_LEAST`               | `@studnicky/filters/matching` |
| `SorensenDiceAtLeastPlugin`       | `SORENSEN_DICE_AT_LEAST`       | `@studnicky/filters/matching` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/filters)
