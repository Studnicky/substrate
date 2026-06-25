---
title: Lifecycle Hooks
description: Every Substrate primitive exposes protected lifecycle hooks at each observable stage, so consumers can inject tracing, logging, and metrics by subclassing — without the base class ever depending on a logger.
---

# Lifecycle Hooks

Every stateful Substrate primitive exposes **protected lifecycle hooks** — one at
every stage a consumer might want to observe. If you are debugging and want to
inject a trace or log line "right here," there is a hook for "right here."

This is how Substrate keeps observability out of the base classes while still
making every internal stage observable. The base class never logs, never
references a logger, and never emits metrics. The hooks are the seam.

## The idiom

A hook is a `protected` method with a no-op default. The base class calls it
synchronously at the exact stage; a subclass overrides it to observe.

- **No-op by default.** A bare (un-subclassed) instance behaves exactly as if the
  hooks did not exist. Adding hooks is non-breaking.
- **Synchronous and raw.** Hooks are called inline at the stage, after the
  relevant state change, so an override sees committed state.
- **Observation only.** Overrides should not throw or block; they exist to log,
  count, and trace — not to alter control flow.
- **Subclass to observe.** Override only the hooks you care about. Everything you
  don't override stays a no-op.

## Using a hook

Subclass the primitive and override the hooks you want to trace. This example
overrides `@studnicky/retry`'s hooks to print a step-by-step debug trace and to
collect telemetry — the base `Retry` class stays free of any logger:

<<< ../../packages/retry/examples/observedRetry.ts#usage

Every package ships an analogous `observed<Package>.ts` runnable demo under its
`examples/` directory. Run any of them with `npx tsx` to watch the trace print:

```bash
npx tsx packages/retry/examples/observedRetry.ts
```

## Naming vocabulary

Hook names are consistent across packages so the same concept reads the same
everywhere:

| Domain | Hooks |
|--------|-------|
| Operation span | `onStart` · `onSuccess` · `onError` · `onSettled` |
| Resources & locks | `onAcquire` · `onAcquireWait` · `onContended` · `onRelease` · `onTimeout` |
| Queues & streams | `onEnqueue` · `onDequeue` · `onDrop` · `onOverflow` · `onSlowConsumer` |
| Cache | `onHit` · `onMiss` · `onSet` · `onUpdate` · `onEvict` · `onExpire` · `onDelete` · `onClear` |
| State machines | `onTransition` · `onEnterState` · `onExitState` · `onTransitionRejected` · `onEffectStart` / `onEffectSuccess` / `onEffectError` |
| Circuit & rate limiting | `onTrip` · `onOpen` · `onHalfOpen` · `onClose` · `onReject` · `onTokenAcquired` · `onTokenDepleted` · `onRefill` |
| Publish / subscribe | `onPublish` · `onSubscribe` · `onUnsubscribe` · `onDeliver` · `onHandlerError` |

Packages add domain-specific hooks beyond these where a stage has no general name.

## Free-function primitives

A primitive that is a plain function rather than a class cannot be subclassed.
For these — currently [`@studnicky/batch`](/packages/batch) — the same stages are
exposed as an optional `hooks` object on the options, with callback observers
using the same event names. The callbacks are optional; omitting them costs
nothing.

## Hook reference by package

Each package's own page has a full table describing every hook, its trigger, and
its arguments. This index is the at-a-glance map of where each stage lives.

### Stateful primitives

| Package | Lifecycle hooks |
|---------|-----------------|
| [cache](/packages/cache#observability-hooks) | `onHit` `onMiss` `onSet` `onUpdate` `onEvict` `onExpire` `onDelete` `onClear` |
| [circular-buffer](/packages/circular-buffer#observability-hooks) | `onPush` `onShift` `onOverflow` `onEvict` `onGrow` |
| [clock](/packages/clock#observability-hooks) | `onNow` `onHrtime` `onAdvance` `onNowMs` |
| [concurrency](/packages/concurrency#observability-hooks) | `onAcquire` `onAcquireWait` `onContended` `onRelease` `onReleaseDelegated` `onSend` `onReceive` `onEnqueue` `onDequeue` `onClose` `onPublishDropped` `onCoalesceStart` `onCoalesceJoin` `onCoalesceSettled` |
| [context](/packages/context#observability-hooks) | `onInitialize` `onMissingContext` `onSet` `onGet` `onDelete` `onEnter` `onExit` `onBeforeExecute` `onAfterExecute` `onError` `onTerminate` `onTerminatedAccess` `onDispose` |
| [event-bus](/packages/event-bus#observability-hooks) | `onPublish` `onSubscribe` `onUnsubscribe` `onDeliver` `onEnqueue` `onDequeue` `onDrop` `onOverflow` `onSlowConsumer` `onHandlerError` `onDispose` |
| [file-lock](/packages/file-lock#observability-hooks) | `onAcquireStart` `onAcquireWait` `onContended` `onAcquire` `onRelease` `onStaleDetected` `onStaleBreak` `onTimeout` `onError` |
| [fsm](/packages/fsm#observability-hooks) | `onTransition` `onEnterState` `onExitState` `onTransitionRejected` `onEffectStart` `onEffectSuccess` `onEffectError` `onStart` `onStop` `onEnqueue` `onRegister` `onUnregister` `onResolveMiss` |
| [logger](/packages/logger#observability-hooks) | `onLog` `onDropped` `onChildCreate` `onTransportError` `onFieldSet` `onBuild` `onBuildError` |
| [mutex](/packages/mutex#observability-hooks) | `beforeAcquire` `afterAcquire` `onAcquireWait` `onContended` `onEnterKey` `beforeRelease` `onRelease` `afterRelease` `onQueueDrain` `onTimeout` |
| [pipeline](/packages/pipeline#observability-hooks) | `onRunStart` `beforeStage` `onStageStart` `onStageSuccess` `afterStage` `onStageError` `onRunComplete` `onRunError` |
| [resilience](/packages/resilience#observability-hooks) | `onSuccess` `onFailure` `onTrip` `onOpen` `onHalfOpen` `onClose` `onReject` `onTokenAcquired` `onTokenDepleted` `onRefill` `onWait` `onEnqueue` `onDequeue` `onOverflow` `onYield` `onDone` `onAbort` |
| [retry](/packages/retry#observability-hooks) | `enterCall` `onAttempt` `classifyError` `onRetryableError` `onRetryScheduled` `onGiveUp` `onSuccess` |
| [sample-buffer](/packages/sample-buffer#observability-hooks) | `onPush` `onOverflow` `onEvict` `onComputeStart` `onComputeComplete` `onPercentile` `onClear` |
| [scheduler](/packages/scheduler#observability-hooks) | `onSchedule` `onFire` `onFireError` `onReschedule` `onCancel` `onCancelAll` `onAdvance` `onRunUntil` `onDrift` `onMiss` `onIdle` |
| [throttle](/packages/throttle#observability-hooks) | `onEnter` `onAcquire` `onAcquireWait` `onContended` `onReject` `onRelease` `onWindowSlide` `onAdaptiveAdjust` `onDrainStart` `onDrainComplete` `onAbortStart` |
| [timing](/packages/timing#observability-hooks) | `onInitialize` `onEvent` `onGetEvents` `onEvict` `onClear` |

### Free-function primitives

| Package | Options callbacks |
|---------|-------------------|
| [batch](/packages/batch#observability-hooks) | `onBatchStart` `onItemStart` `onItemSuccess` `onItemError` `onItemSettled` `onConcurrencySaturated` `onBatchComplete` |
