# @studnicky/topic-router-models

> Contracts that let a model contribute routing evidence without owning routing policy.

`TopicInferenceInterface` produces generic score evidence. `TopicSelectionMapperInterface` lets an application decide which evidence becomes `TopicSelectionInterface` data for `TopicRouter.publishSelected()`.

No class in this package owns a model client, subscription registry, threshold, fallback path, or delivery lifecycle. Consumers compose their own provider adapter and selection policy with `@studnicky/semantic-matching`, `@studnicky/matching`, and `@studnicky/topic-router`.

## License

MIT
