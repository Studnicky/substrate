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

Create a `Signal` instance with `Signal.create()`. Its async `compose` method combines a caller `AbortSignal` and a timeout deadline using `AbortSignal.any`. The composed signal aborts as soon as either source fires. If neither is provided, it returns the never-aborting sentinel so consuming code always receives a valid `AbortSignal`.

<<< ../../packages/signal/examples/compose.ts#usage

### Never-aborting sentinel and deadline signal

The sentinel is a singleton: `Signal.never()` returns the same `AbortSignal` instance on every call. `Signal.create().compose({ deadlineMs })` creates a deadline signal through the same observed composition path used for every other option combination.

<<< ../../packages/signal/examples/neverTimeout.ts#usage

## Try it

<RunnableExample src="packages/signal/examples/compose" title="AbortSignal composition — all four cases" />

The output confirms each composition case: caller+deadline composite, caller-only passthrough, deadline-only timeout, the never-aborting sentinel, and `SignalError` thrown for invalid deadline values.

## API

Import `Signal`, `SignalError`, and `RaceTimeout` from `@studnicky/signal`. The package root is the only public code entrypoint.

| Export | Type | Description |
|--------|------|-------------|
| `Signal` | class | Instance-based AbortSignal composition with a static never-aborting sentinel |
| `SignalError` | class | Invalid signal-composition configuration |
| `RaceTimeout` | class | Abort-aware timeout race primitive |

### `Signal`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static () => Signal` | Creates a Signal instance |
| `compose` | `(options: { signal?, deadlineMs? }) => Promise<AbortSignal>` | Merges caller signal and/or timeout; returns never-signal when neither is provided |
| `never` | `static () => AbortSignal` | Returns a singleton signal that never aborts |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/signal)
