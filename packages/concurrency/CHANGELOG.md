# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Semaphore`: counting permit gate with `acquire()` returning an idempotent release function, `withPermit()` for automatic acquire/release around a callback, and `available`/`permits` getters.
- `Coalesce`: keyed async coalescing that shares a single in-flight promise across concurrent callers for the same key; `isInflight()` for observability.
- `Channel`: string-keyed fan-in async generator inbox; `publish()` buffers items to a named key, `subscribe()` yields them as an async generator, `close()` terminates all active subscribers.
- `AsyncIter`: static-method class with three async-iterable combinators — `merge()` for FIFO fan-in of N sources, `filter()` for sync/async predicate filtering, and `enrich()` for left-join enrichment with null-passthrough.
