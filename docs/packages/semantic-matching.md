---
title: '@studnicky/semantic-matching'
description: Provider-neutral contracts for model-assisted matching operations.
---

# @studnicky/semantic-matching

`@studnicky/semantic-matching` defines provider-neutral contracts for vectorization, vector search,
classification, reranking, and adjudication. Consumers supply model or index implementations and
compose these contracts with deterministic matching primitives.

## Install

```bash
pnpm add @studnicky/semantic-matching
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `AdjudicationInputInterface` | Defines candidate content and the requested adjudication limit. | `@studnicky/semantic-matching` |
| `AdjudicationInterface` | Defines an adjudicated candidate identifier and confidence. | `@studnicky/semantic-matching` |
| `AdjudicatorInterface` | Defines provider-neutral candidate adjudication. | `@studnicky/semantic-matching` |
| `ClassificationInputInterface` | Defines content and optional candidate labels for classification. | `@studnicky/semantic-matching` |
| `ClassificationInterface` | Defines a classified label and confidence. | `@studnicky/semantic-matching` |
| `ClassifierInterface` | Defines provider-neutral content classification. | `@studnicky/semantic-matching` |
| `RerankerInterface` | Defines provider-neutral candidate reranking. | `@studnicky/semantic-matching` |
| `RerankInputInterface` | Defines content and candidate identifiers for reranking. | `@studnicky/semantic-matching` |
| `RerankMatchInterface` | Defines a reranked candidate identifier and score. | `@studnicky/semantic-matching` |
| `VectorEntryInterface` | Defines a namespaced vector entry. | `@studnicky/semantic-matching` |
| `VectorIndexInterface` | Defines namespaced vector upsert, deletion, and search. | `@studnicky/semantic-matching` |
| `VectorizationInputInterface` | Defines content and optional metadata for vectorization. | `@studnicky/semantic-matching` |
| `VectorizerInterface` | Defines provider-neutral vector creation and model identity. | `@studnicky/semantic-matching` |
| `VectorMatchInterface` | Defines a vector search result identifier and score. | `@studnicky/semantic-matching` |
| `VectorSearchOptionsInterface` | Defines the vector search namespace and result limit. | `@studnicky/semantic-matching` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/semantic-matching)
