---
"@studnicky/fetch": major
---

`FetchClient` and `BrowserFetchClient` build their `RequestInit` from an explicit field projection instead of spreading whatever remained after destructuring the control fields away. The projected field set is a schema-derived entity, and it is the same union `FetchOptionsInterface` omits from `RequestInit`, so the interface and the projection cannot drift. Adding a field to that entity without a matching copier fails the build rather than silently dropping the field at runtime. `dispatcher`, `signal` and `timeout` are returned as separate control fields and are not forwarded to `fetch`.
