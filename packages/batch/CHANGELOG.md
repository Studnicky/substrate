# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `batchConcurrent.process` — async generator that processes items in controlled batches with configurable concurrency, yielding `TResult[]` per batch as each completes.
- `batchConcurrent.processSettled` — variant with partial-failure support using `Promise.allSettled`, yielding `PromiseSettledResult<TResult>[]` per batch so individual rejections do not abort processing.
- Concurrency control via a numeric argument or `{ maxConcurrent }` options object; defaults to 10 concurrent operations per batch.
- Streaming/backpressure semantics via async generators — results are available batch-by-batch without waiting for all items to complete.
