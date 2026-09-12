---
title: '@studnicky/semantic-matching'
description: Provider-neutral contracts for model-assisted matching operations.
---

# @studnicky/semantic-matching

`@studnicky/semantic-matching/interfaces` defines provider-neutral contracts for vectorization, vector search,
classification, reranking, and adjudication. Consumers supply model or index implementations and
compose these contracts with deterministic matching primitives.

## Install

```bash
pnpm add @studnicky/semantic-matching
```

## Try it

Implement the vectorizer and index contracts with an in-memory adapter, then index and search two help articles. Replace these local implementations with your model and vector-store adapters.

<RunnableExample src="packages/semantic-matching/examples/vectorSearchContract" title="Implement vectorizer and vector-index contracts" />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `AdjudicationInputInterface` | Defines candidate content and the requested adjudication limit. | `@studnicky/semantic-matching/interfaces` |
| `AdjudicationInterface` | Defines an adjudicated candidate identifier and confidence. | `@studnicky/semantic-matching/interfaces` |
| `AdjudicatorInterface` | Defines provider-neutral candidate adjudication. | `@studnicky/semantic-matching/interfaces` |
| `ClassificationInputInterface` | Defines content and optional candidate labels for classification. | `@studnicky/semantic-matching/interfaces` |
| `ClassificationInterface` | Defines a classified label and confidence. | `@studnicky/semantic-matching/interfaces` |
| `ClassifierInterface` | Defines provider-neutral content classification. | `@studnicky/semantic-matching/interfaces` |
| `RerankerInterface` | Defines provider-neutral candidate reranking. | `@studnicky/semantic-matching/interfaces` |
| `RerankInputInterface` | Defines content and candidate identifiers for reranking. | `@studnicky/semantic-matching/interfaces` |
| `RerankMatchInterface` | Defines a reranked candidate identifier and score. | `@studnicky/semantic-matching/interfaces` |
| `VectorEntryInterface` | Defines a namespaced vector entry. | `@studnicky/semantic-matching/interfaces` |
| `VectorIndexInterface` | Defines namespaced vector upsert, deletion, and search. | `@studnicky/semantic-matching/interfaces` |
| `VectorizationInputInterface` | Defines content and optional metadata for vectorization. | `@studnicky/semantic-matching/interfaces` |
| `VectorizerInterface` | Defines provider-neutral vector creation and model identity. | `@studnicky/semantic-matching/interfaces` |
| `VectorMatchInterface` | Defines a vector search result identifier and score. | `@studnicky/semantic-matching/interfaces` |
| `VectorSearchOptionsInterface` | Defines the vector search namespace and result limit. | `@studnicky/semantic-matching/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/semantic-matching)
