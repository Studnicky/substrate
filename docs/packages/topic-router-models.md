---
title: '@studnicky/topic-router-models'
description: Model-assisted topic inference contracts for composition with topic routing.
---

# @studnicky/topic-router-models

`@studnicky/topic-router-models/interfaces` provides small provider-neutral inference and selection-mapping
contracts. Consumers own the model implementation and compose its evidence with deterministic
topic-routing primitives.

## Install

```bash
pnpm add @studnicky/topic-router-models
```

## Try it

Turn model inference evidence into router selections, then deliver the selected support topic with its score evidence. Supply your own inference implementation in production.

<RunnableExample src="packages/topic-router-models/examples/mapInferenceToRoute" title="Map model evidence into topic-router selections" />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `TopicInferenceInterface` | Defines model-assisted evidence inference for consumer input. | `@studnicky/topic-router-models/interfaces` |
| `TopicSelectionMapperInterface` | Defines evidence-to-topic-selection mapping. | `@studnicky/topic-router-models/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/topic-router-models)
