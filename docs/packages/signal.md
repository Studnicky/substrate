---
title: '@studnicky/signal'
description: AbortSignal composition helpers for deadline, caller signal, and never-aborting sentinel.
---

# @studnicky/signal

> Compose AbortSignals from callers and deadlines without repetitive AbortController boilerplate.

## Install

```bash
pnpm add @studnicky/signal
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### Compose a signal from a caller signal and/or a deadline

`Signal.compose` combines a caller `AbortSignal` and a timeout deadline using `AbortSignal.any`. The composed signal aborts as soon as either source fires. If neither is provided, it returns the never-aborting sentinel so consuming code always receives a valid `AbortSignal`.

<<< ../../packages/signal/examples/compose.ts#usage

### Never-aborting sentinel and timeout signal

The sentinel is a singleton: `Signal.never()` returns the same `AbortSignal` instance on every call. `Signal.timeout(ms)` wraps `AbortSignal.timeout` for convenience.

<<< ../../packages/signal/examples/neverTimeout.ts#usage

## API

| Export | Type | Description |
|--------|------|-------------|
| `Signal` | class | Static-only AbortSignal composition helpers |

### `Signal`

| Member | Signature | Description |
|--------|-----------|-------------|
| `compose` | `static (options: { signal?, deadlineMs? }) => AbortSignal` | Merges caller signal and/or timeout; returns never-signal when neither is provided |
| `timeout` | `static (ms: number) => AbortSignal` | Returns `AbortSignal.timeout(ms)` |
| `never` | `static () => AbortSignal` | Returns a singleton signal that never aborts |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/signal)
