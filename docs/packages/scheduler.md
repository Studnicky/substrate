---
title: "@studnicky/scheduler"
description: Real-time and virtual (min-heap) scheduler primitives for deterministic testing.
---

# @studnicky/scheduler

> Scheduler primitives: real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations.

## Install

```bash
pnpm add @studnicky/scheduler
```

## Usage

### Virtual scheduler (deterministic)

A stock-refresh job scheduled to run at a specific future moment shouldn't actually have to wait for that moment in a test — `VirtualScheduler` lets Northstar schedule one-shot tasks against virtual timestamps and fast-forward time in controlled steps instead. The example schedules tasks at virtual ms 100 and 200, then advances to 150 — firing only the first — before a second advance crosses 200 and fires the rest, proving tasks fire exactly when their due time is reached and not a moment sooner.

<<< ../../packages/scheduler/examples/virtual-scheduler.ts#usage

### Interval tasks and cancellation

A repeating stock-refresh check needs to fire on a fixed cadence, and when Northstar shuts it down, it needs to actually stop — not keep firing from some orphaned timer. `scheduleEvery` sets up the repeating side of that story; `cancelAll` handles the shutdown. The example proves both: a 50ms interval advanced 200ms fires exactly four times, while an identical interval cancelled before any time advances never fires at all.

<<< ../../packages/scheduler/examples/interval-tasks.ts#usage

### Scheduler-aware sleep

Code that needs to pause for a moment shouldn't force its tests to actually sit and wait that moment out. `Delay.sleep(ms, { clock?, scheduler?, signal? })` resolves through whichever scheduler you hand it, so a `VirtualScheduler` paired with a `VirtualClockProvider` sharing one counter makes the wait deterministic — no wall-clock timers, no flakiness. The example sleeps for a real 10ms first, then schedules a virtual 1000ms sleep, confirms it hasn't resolved yet, advances the counter by exactly 1000ms, and watches the promise resolve the instant that threshold is crossed.

<<< ../../packages/scheduler/examples/delay.ts#usage

### Reducer-with-effects process composition

A background job process sometimes needs more than a scheduler alone can give it — a state machine to track where the job is, effects to trigger scheduled work, and a cancellation signal to cut it short. The example below composes a `StateMachine`, `EffectInterpreter`, `VirtualScheduler`, and `Signal` directly into one job process: it distinguishes an acknowledgment that dispatches within the same drain cycle from a scheduled advance that arrives through `interpreter.send()` after the cycle ends, cancels pending scheduled work through an `AbortSignal`, and exercises both a deliberately rejected transition and an attempt to act on an already-terminated machine. It runs node-only, since it relies on `node:assert`.

<<< ../../packages/scheduler/examples/processKitComposition.ts

## Public API

Import `Delay`, `RealTimeScheduler`, `VirtualScheduler`, and `SchedulerError` from `@studnicky/scheduler/node`; import `PendingTaskInterface`, `ScheduledTaskInterface`, and `SchedulerProviderInterface` from `@studnicky/scheduler/interfaces`. Construct schedulers through `RealTimeScheduler.create()` or `VirtualScheduler.create({ counter })`.

## Extending

A `WorkQueue` that hard-codes `VirtualScheduler` can never be swapped to real timers in production, or back to virtual time in a test, without editing its internals. Depend on the injectable `SchedulerProviderInterface` instead, and any scheduler implementation can be passed in from outside. The example below wires a `LoggingScheduler` subclass — one that records every `schedule` and `fire` event — into a `WorkQueue` that only knows about the interface, then enqueues two labeled tasks and advances time to watch both the scheduler's log and the queue's processed output land in the right order.

<<< ../../packages/scheduler/examples/di-provider.ts#usage

## Observability hooks

`VirtualScheduler` and `RealTimeScheduler` expose the same named set of protected lifecycle hooks, so a subclass written against one carries over to the other. One hook's declared return type differs between the two: `VirtualScheduler.onFire` is `(id: string): void | Promise<void>`, while `RealTimeScheduler.onFire` remains `(id: string): void`. Override any of them to add logging, metrics, or alerting without wiring the scheduler itself to any particular library.

### VirtualScheduler hooks

| Hook                            | When it fires                                                                    | Args                                                             |
| ------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `onSchedule(id, atMs, variant)` | After a task is inserted into the heap via `scheduleAt` or `scheduleEvery`       | `id: string`, `atMs: number`, `variant: 'timeout' \| 'interval'` |
| `onAdvance(deltaMs)`            | At the start of `advance()`, before the counter is incremented                   | `deltaMs: number`                                                |
| `onRunUntil(atMs)`              | At the start of `runUntil()`                                                     | `atMs: number`                                                   |
| `onFire(id)`                    | Immediately before a task's `fire` callback is invoked                           | `id: string`                                                     |
| `onFireError(id, error)`        | When a task's `fire` callback throws synchronously or returns a rejected Promise | `id: string`, `error: unknown`                                   |
| `onReschedule(id, atMs)`        | After an interval task is re-inserted into the heap following a successful fire  | `id: string`, `atMs: number` (next scheduled time)               |
| `onCancel(id)`                  | When a task's `cancel()` method is invoked                                       | `id: string`                                                     |
| `onCancelAll()`                 | At the end of `cancelAll()`                                                      | —                                                                |
| `onIdle()`                      | After `runUntil` / `runAll` drains the heap, or after `cancelAll`                | —                                                                |

### RealTimeScheduler hooks

| Hook                                    | When it fires                                                                    | Args                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `onSchedule(id, atMs, variant)`         | After a task is registered via `scheduleAt` or `scheduleEvery`                   | `id: string`, `atMs: number`, `variant: 'timeout' \| 'interval'`     |
| `onFire(id)`                            | Inside the timer callback, immediately before `fire` is invoked                  | `id: string`                                                         |
| `onFireError(id, error)`                | When a task's `fire` callback throws synchronously or returns a rejected Promise | `id: string`, `error: unknown`                                       |
| `onDrift(id, dueMs, actualMs, driftMs)` | When a one-shot task fires later than its scheduled `atMs`                       | `id: string`, `dueMs: number`, `actualMs: number`, `driftMs: number` |
| `onMiss(id, atMs, nowMs)`               | When `scheduleAt` receives an `atMs` already in the past                         | `id: string`, `atMs: number`, `nowMs: number`                        |
| `onCancel(id)`                          | When a task's `cancel()` method is invoked                                       | `id: string`                                                         |
| `onCancelAll()`                         | At the end of `cancelAll()`, after all timers are cleared                        | —                                                                    |
| `onIdle()`                              | After `cancelAll` fully drains all tracked tasks                                 | —                                                                    |

### Demo trace (virtual scheduler)

<<< ../../packages/scheduler/examples/observedScheduler.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

This demo subclasses `VirtualScheduler` and overrides all nine protected lifecycle methods to print a full trace as three tasks run their course — a one-shot, a repeating interval, and one that deliberately throws. Watch every `scheduleAt`/`scheduleEvery` call emit `schedule`, each `advance()` emit `advance` then `runUntil`, the failing task trigger both `fire` and `fireError`, the interval reschedule itself after every fire, and `cancelAll` followed by `idle` close out the run.

<RunnableExample src="packages/scheduler/examples/observedScheduler" title="Scheduler lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/scheduler)

## Entities

`@studnicky/scheduler/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { SchedulerTaskDataEntity } from "@studnicky/scheduler/entities";
```

## Interfaces

`@studnicky/scheduler/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { PendingTaskInterface } from "@studnicky/scheduler/interfaces";
```

## What it is

`@studnicky/scheduler` is a real-time and deterministic virtual scheduling primitive. It schedules and cancels local work against a selected clock; it does not own a job service, persistence layer, business calendar, or workflow.

## What it is for

Northstar Books uses a scheduler when a local process needs a delay, a follow-up, or repeatable time-driven behaviour in a test. A Node or browser runtime entrypoint selects the safe platform surface, while entities validate scheduled-task data and interfaces let Northstar supply a scheduler without coupling its domain process to a timer implementation.

## Northstar Books examples

- **Scheduler lifecycle hooks** solves the “observe scheduled stock-refresh work without embedding monitoring in the scheduler” problem. It traces one-shot and interval tasks, failures, rescheduling, cancellation, and idle state, proving that Northstar can attach telemetry while the scheduling result remains unchanged.

## Public entrypoints

| Import path                       | Use it when                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@studnicky/scheduler/node`       | Northstar schedules local server-side catalogue refreshes, delayed work, or deterministic test tasks.                    |
| `@studnicky/scheduler/browser`    | Northstar schedules browser-side reader or bookseller interface work with the same primitive contract.                   |
| `@studnicky/scheduler/entities`   | Northstar validates scheduler task data at an application boundary.                                                      |
| `@studnicky/scheduler/interfaces` | Northstar accepts an injectable scheduler port or types pending and scheduled tasks without selecting an implementation. |

## Exports

| Symbol                       | Purpose                                     | Import path                       |
| ---------------------------- | ------------------------------------------- | --------------------------------- |
| `Delay`                      | Provides delay functionality.               | `@studnicky/scheduler/node`       |
| `RealTimeScheduler`          | Provides real time scheduler functionality. | `@studnicky/scheduler/node`       |
| `SchedulerError`             | Represents scheduler failures.              | `@studnicky/scheduler/node`       |
| `SchedulerProviderInterface` | Defines the scheduler provider contract.    | `@studnicky/scheduler/interfaces` |
| `VirtualScheduler`           | Provides virtual scheduler functionality.   | `@studnicky/scheduler/node`       |
