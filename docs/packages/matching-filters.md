---
title: '@studnicky/matching-filters'
description: FilterEngine adapters for deterministic matching primitives.
---

# @studnicky/matching-filters

Each plugin owns exactly one filter operation. It validates its untrusted filter value with a composed `@studnicky/types` predicate, calls one `@studnicky/matching` primitive, and returns the resulting boolean to `FilterEngine`.

## Install

```bash
pnpm add @studnicky/matching-filters
```

## Try it

Register a matching plugin with `FilterEngine` and accept records whose title meets a Levenshtein similarity threshold.

<RunnableExample src="packages/matching-filters/examples/fuzzyFilter" title="Fuzzy title filter with a matching plugin" />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `CosineAtLeastPlugin` | `COSINE_AT_LEAST` | `@studnicky/matching-filters/node` |
| `DamerauLevenshteinAtLeastPlugin` | `DAMERAU_LEVENSHTEIN_AT_LEAST` | `@studnicky/matching-filters/node` |
| `JaccardAtLeastPlugin` | `JACCARD_AT_LEAST` | `@studnicky/matching-filters/node` |
| `JaroAtLeastPlugin` | `JARO_AT_LEAST` | `@studnicky/matching-filters/node` |
| `JaroWinklerAtLeastPlugin` | `JARO_WINKLER_AT_LEAST` | `@studnicky/matching-filters/node` |
| `LevenshteinAtLeastPlugin` | `LEVENSHTEIN_AT_LEAST` | `@studnicky/matching-filters/node` |
| `NgramAtLeastPlugin` | `NGRAM_AT_LEAST` | `@studnicky/matching-filters/node` |
| `SorensenDiceAtLeastPlugin` | `SORENSEN_DICE_AT_LEAST` | `@studnicky/matching-filters/node` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/matching-filters)
