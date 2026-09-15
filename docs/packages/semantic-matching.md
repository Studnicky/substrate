---
title: "@studnicky/semantic-matching"
description: "Provider-neutral contracts and validated models for semantic matching operations."
---

# @studnicky/semantic-matching

Use this package to define vectorization, vector-index, reranking, classification, and adjudication adapters. Import adapter contracts from `@studnicky/semantic-matching/interfaces` and JSON models from `@studnicky/semantic-matching/entities`.

## Install

```bash
pnpm add @studnicky/semantic-matching
```

## Try it

Implement a vectorizer and vector-index adapter, then index and search local help articles.

<RunnableExample src="packages/semantic-matching/examples/vectorSearchContract" title="Implement vectorizer and vector-index contracts" />

## Validate JSON model data

Each entity namespace provides `Schema`, `validate`, `intake`, `create`, and its canonical `Type`. Use `intake` for provider input and output at the application boundary.

<<< ../../packages/semantic-matching/examples/validateClassification.ts#usage


## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `AdjudicationEntity` | Validates an adjudicated candidate identifier and confidence. | `@studnicky/semantic-matching/entities` |
| `AdjudicationInputEntity` | Validates adjudication content, candidate identifiers, and limit. | `@studnicky/semantic-matching/entities` |
| `ClassificationEntity` | Validates a classified label and confidence. | `@studnicky/semantic-matching/entities` |
| `ClassificationInputEntity` | Validates classification content and optional labels. | `@studnicky/semantic-matching/entities` |
| `RerankInputEntity` | Validates reranking content and candidate identifiers. | `@studnicky/semantic-matching/entities` |
| `RerankMatchEntity` | Validates a reranked candidate identifier and score. | `@studnicky/semantic-matching/entities` |
| `VectorEntryDataEntity` | Validates the JSON identifier and namespace for a vector entry. | `@studnicky/semantic-matching/entities` |
| `VectorMatchEntity` | Validates a vector search result identifier and score. | `@studnicky/semantic-matching/entities` |
| `VectorizationInputEntity` | Validates vectorization content and optional metadata. | `@studnicky/semantic-matching/entities` |
| `VectorSearchOptionsEntity` | Validates vector search namespace and result limit. | `@studnicky/semantic-matching/entities` |
| `AdjudicatorInterface` | Defines provider-neutral candidate adjudication. | `@studnicky/semantic-matching/interfaces` |
| `ClassifierInterface` | Defines provider-neutral content classification. | `@studnicky/semantic-matching/interfaces` |
| `RerankerInterface` | Defines provider-neutral candidate reranking. | `@studnicky/semantic-matching/interfaces` |
| `VectorEntryInterface` | Composes `VectorEntryDataEntity.Type` with a `Float32Array` vector. | `@studnicky/semantic-matching/interfaces` |
| `VectorIndexInterface` | Defines namespaced vector upsert, deletion, and search. | `@studnicky/semantic-matching/interfaces` |
| `VectorizerInterface` | Defines provider-neutral vector creation and model identity. | `@studnicky/semantic-matching/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/semantic-matching)
