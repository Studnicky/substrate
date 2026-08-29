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

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `CosineAtLeastPlugin` | `COSINE_AT_LEAST` | `@studnicky/matching-filters` |
| `DamerauLevenshteinAtLeastPlugin` | `DAMERAU_LEVENSHTEIN_AT_LEAST` | `@studnicky/matching-filters` |
| `JaccardAtLeastPlugin` | `JACCARD_AT_LEAST` | `@studnicky/matching-filters` |
| `JaroAtLeastPlugin` | `JARO_AT_LEAST` | `@studnicky/matching-filters` |
| `JaroWinklerAtLeastPlugin` | `JARO_WINKLER_AT_LEAST` | `@studnicky/matching-filters` |
| `LevenshteinAtLeastPlugin` | `LEVENSHTEIN_AT_LEAST` | `@studnicky/matching-filters` |
| `NgramAtLeastPlugin` | `NGRAM_AT_LEAST` | `@studnicky/matching-filters` |
| `SorensenDiceAtLeastPlugin` | `SORENSEN_DICE_AT_LEAST` | `@studnicky/matching-filters` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/matching-filters)
