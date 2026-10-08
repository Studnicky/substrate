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

A reader's title search needs to stop the moment either of two things happens: the reader cancels, or the supplier's allotted time runs out — whichever comes first. `Signal.create()` gives you a `compose()` method that combines a caller `AbortSignal` and a timeout deadline with `AbortSignal.any`, aborting as soon as either source fires; supply neither and it hands back a never-aborting sentinel instead, so the calling code never has to branch on whether a signal exists. The example below runs through every combination — both sources, each alone, neither, a zero-millisecond deadline, and the `SignalError` thrown for a negative or `NaN` deadline — to pin down the exact behavior of each case.

<<< ../../packages/signal/examples/compose.ts#usage

### Never-aborting sentinel and deadline signal

Not every operation has a caller signal or a deadline — sometimes the honest answer is "this never gets cancelled," and code further down the chain still needs a real `AbortSignal` to pass around. `Signal.never()` is built for that: every call hands back a fresh `AbortSignal` that simply never aborts, so there's no shared state to worry about. The example below confirms three successive calls return three distinct, never-aborted signals, then checks that `compose({ deadlineMs })` still produces its own distinct signal for each deadline, following the same composition path proven in the previous example.

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
| `never`   | `static () => AbortSignal`                                                | Returns a fresh signal that never aborts                                                                           |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/signal)
