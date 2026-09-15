# @studnicky/semantic-matching

> Provider-neutral contracts and validated JSON models for vectorization, search, reranking, classification, and adjudication.

Use this package to connect a model provider and vector index without coupling application code to a provider SDK. Import behavior contracts from "/interfaces" and validate JSON inputs and results with the matching namespace from "/entities".

## Install

```sh
pnpm add @studnicky/semantic-matching
```

## Use a vectorizer and index

```ts
import { VectorSearchOptionsEntity } from "@studnicky/semantic-matching/entities";
import type { VectorIndexInterface, VectorizerInterface } from "@studnicky/semantic-matching/interfaces";

async function findCandidates(
  vectorizer: VectorizerInterface,
  index: VectorIndexInterface,
  content: string
) {
  const vector = await vectorizer.embed({ content });
  const options = VectorSearchOptionsEntity.intake({
    limit: 20,
    namespace: "topics"
  });

  return index.search(vector, options);
}
```

## Validate provider data

Each JSON model has `Schema`, `validate`, `intake`, and `create`. Use `intake` at an external boundary; it rejects malformed and undeclared properties before the value reaches your adapter.

```ts
import { ClassificationEntity } from "@studnicky/semantic-matching/entities";

const classification = ClassificationEntity.intake({
  confidence: 0.94,
  label: "billing"
});
```

The entity namespaces expose their canonical `Type` for adapter method signatures. `VectorEntryInterface` composes `VectorEntryDataEntity.Type` with its `Float32Array` runtime vector.

For runnable examples and the complete API reference, see the [semantic-matching guide](https://studnicky.github.io/substrate/packages/semantic-matching).

## License

MIT
