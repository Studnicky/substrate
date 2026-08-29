# @studnicky/semantic-matching

> Contracts for model-backed matching primitives.

`@studnicky/semantic-matching` defines the smallest boundaries required to compose vectorization, vector search, reranking, classification, and adjudication. It does not choose a provider, require a database, persist vectors, set thresholds, or select topics.

## Install

```sh
pnpm add @studnicky/semantic-matching
```

## Usage

```ts
import type { VectorIndexInterface, VectorizerInterface } from '@studnicky/semantic-matching';

async function findCandidates(
  vectorizer: VectorizerInterface,
  index: VectorIndexInterface,
  content: string
) {
  const vector = await vectorizer.embed({ content });
  return index.search(vector, { limit: 20, namespace: 'topics' });
}
```

The result can feed a deterministic scorer, a consumer-defined evidence mapper, or a router selection call. Each adapter stays independently replaceable.

## License

MIT
