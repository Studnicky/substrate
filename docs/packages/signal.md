---
title: "@studnicky/signal"
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

The sentinel is a singleton: `Signal.never()` returns the same `AbortSignal` instance on every call. `Signal.create().compose({ deadlineMs })` accepts whole milliseconds from 0 through 2,147,483,647 and creates a deadline signal through the same observed composition path used for every other option combination.

<<< ../../packages/signal/examples/neverTimeout.ts#usage

## Try it

<RunnableExample src="packages/signal/examples/compose" title="AbortSignal composition — all four cases" />

The output confirms each composition case: caller+deadline composite, caller-only passthrough, deadline-only timeout, the never-aborting sentinel, and `SignalError` thrown for invalid deadline values.

## What it is

`@studnicky/signal` is an `AbortSignal` composition primitive for caller cancellation, deadlines, and a never-aborting sentinel. It creates a cancellation boundary; it does not implement a request client, timeout policy, or task workflow.

## What it is for

Northstar Books uses `Signal` when a catalogue lookup or inventory action must stop when either its caller cancels or its allowed time expires. The Node and browser entrypoints are runtime-specific alternatives, and the interfaces entrypoint supplies the compositional contract that Northstar can pass through its own ports.

## Northstar Books examples

- **AbortSignal composition — all four cases** solves the “a reader cancels a title search while the supplier deadline is still active” problem. It demonstrates caller-and-deadline composition, each source alone, the never-aborting fallback, and invalid deadline handling, proving that every downstream lookup receives one valid cancellation signal.

## Public entrypoints

| Import path                    | Use it when                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `@studnicky/signal/node`       | Northstar composes cancellation for a Node-side catalogue or inventory operation.                              |
| `@studnicky/signal/browser`    | Northstar composes cancellation for a browser-side reader search or bookseller action.                         |
| `@studnicky/signal/interfaces` | Northstar accepts or returns a composed signal through a typed port without choosing a runtime implementation. |

## Exports

| Symbol               | Purpose                                                               | Import path              |
| -------------------- | --------------------------------------------------------------------- | ------------------------ |
| `Signal`             | Composes caller and deadline abort signals.                           | `@studnicky/signal/node` |
| `SignalError`        | Represents invalid signal-composition configuration.                  | `@studnicky/signal/node` |
| `SignalTimeoutError` | The `AbortSignal.reason` of a composed signal whose deadline elapsed. | `@studnicky/signal/node` |
| `RaceTimeout`        | Races a value against an abort-aware timeout.                         | `@studnicky/signal/node` |

### `Signal`

| Member    | Signature                                                                 | Description                                                                                                        |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `create`  | `static () => Signal`                                                     | Creates a Signal instance                                                                                          |
| `compose` | `(options: { signal?, deadlineMs? }) => Promise<ComposedSignalInterface>` | Returns a disposable handle whose `signal` merges caller signal and/or timeout; dispose it when the operation ends |
| `never`   | `static () => AbortSignal`                                                | Returns a singleton signal that never aborts                                                                       |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/signal)
