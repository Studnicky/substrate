---
title: '@studnicky/topic-router-models'
description: Model-assisted topic inference contracts for composition with topic routing.
---

# @studnicky/topic-router-models

`@studnicky/topic-router-models` provides small provider-neutral inference and selection-mapping
contracts. Consumers own the model implementation and compose its evidence with deterministic
topic-routing primitives.

## Install

```bash
pnpm add @studnicky/topic-router-models
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `TopicInferenceInterface` | Defines model-assisted evidence inference for consumer input. | `@studnicky/topic-router-models` |
| `TopicSelectionMapperInterface` | Defines evidence-to-topic-selection mapping. | `@studnicky/topic-router-models` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/topic-router-models)
