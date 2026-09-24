---
"@studnicky/fetch": major
---

`FetchClientConfiguration.intake` takes `config: unknown` plus a separate `ConfigurationCollaboratorsInterface` parameter (`clock`, `requestIdGenerator`, `signal`) instead of a single pre-typed `ClientConfigInterface`. Schema-derived config fields go through intake; typed collaborators bypass it entirely, sourced via `FetchClientConfiguration.collaboratorsFrom(config)`.

`FetchOptionsInterface['body']` and the internal `RequestInitEncoder` projection are typed `unknown` end to end — `body` is native-opaque, validated by `fetch()` itself, not by a schema or a guard.
