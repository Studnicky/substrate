---
"@studnicky/fetch": major
---

### Changed

- `FetchClient` direct verb methods are the single request surface for absolute and configured URLs; timeout, abort, body serialization, and dispatcher behavior execute on that path.
- Client configuration contains only behaviorally effective fields; the unused `name` field is not accepted.
- Request, response, client configuration, query parameter, body option, fetch option, and dispatcher contracts are exported from `@studnicky/fetch`; `FetchRequestOptionsEntity` and `ClientConfigDataEntity` own their schema-expressible data fields, while interfaces retain headers, signals, callbacks, and other runtime contracts.
- `UndiciDispatcher.create(agent)` manages health and lifecycle for a caller-owned undici `Agent`; callers retain the Agent they use for request dispatch.
- `@studnicky/fetch` is the sole public code entrypoint.
