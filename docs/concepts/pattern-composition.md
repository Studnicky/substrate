---
title: Pattern Composition
description: How Substrate's pattern kits compose primitives, and how to compose the same primitives directly without a kit at all.
---

# Pattern Composition

A [pattern](/packages/request-executor) in Substrate is a named composition of two or
more primitives — a repeatable runtime shape, still usable without a graph executor. Five
pattern families exist as packages: the **Execution Kit**
(`@studnicky/request-executor`), the **Boundary Kit** (`@studnicky/boundary-kit`), the
**Coordination Kit** — split into `@studnicky/keyed-work-gate` and
`@studnicky/bounded-dispatcher` since a single kit would force the `event-bus` dependency
onto callers who only want keyed serialization — and the **Process Kit**
(`@studnicky/process-kit`). Every primitive each kit wraps is already fully composable on
its own, so each kit's value is a fixed, correctly-ordered composition rather than new
runtime behavior: getting the order backwards by hand is easy to do silently, and each kit
exists to protect a consumer from re-deriving it.

This page documents the fixed composition order each kit uses internally, and how to reach
the identical result by hand-composing the same primitives yourself without depending on
the kit package at all.

See [Lifecycle Hooks](/concepts/lifecycle-hooks) for the hook idiom every composed
primitive uses, [Composition Anti-Patterns](/concepts/composition-anti-patterns) for where
composition tips into orchestration, and the
[Dagonizer Boundary](/concepts/dagonizer-boundary) guide for where substrate composition
ends and workflow orchestration begins.

## The Execution Kit's composition order

`RequestExecutor#execute()` composes its five primitives in one fixed order:

**context scope → timing span → retry loop → the caller's `fn(client, signal)` call**

This order is fixed, not configurable, because each layer's job only makes sense wrapping
everything inside it:

- **Context scope outermost** — `ContextScope#execute()` has to wrap the *entire* call,
  retries included, so that a value set on attempt 2 is still readable on attempt 3, and so
  `scope.terminate()` only runs once the whole operation (successful or not) is finished.
- **Timing span next** — the span is meant to answer "how long did this whole request take,
  including every retry attempt," not "how long did the last attempt take." Bracketing
  outside the retry loop captures that.
- **Retry loop wraps the actual call** — retry needs to be the closest layer to `fn` so that
  every attempt, not just the first, gets the same cancellation signal and runs inside the
  same context/timing span.
- **The composed cancellation signal is threaded through, not layered** — a caller creates
  one instance with `Signal.create()`, then calls `signal.compose(...)` before any of the
  above, merging a caller-supplied `AbortSignal` and/or
  `deadlineMs` into a single `AbortSignal` that every retry attempt receives identically. A
  signal is a value passed down, not a nesting layer. Deadline-only signals use the same
  `signal.compose({ deadlineMs })` route; only the non-aborting sentinel is static:
  `Signal.never()`.

## Using the kit

<<< ../../packages/request-executor/examples/observedRequestExecutor.ts#usage

## Composing the same primitives directly, without the kit

`RequestExecutor` is a thin facade, not a hidden runtime — the [Layer Transparency
Rule](/concepts/lifecycle-hooks) requires that a higher layer never trap a caller away from
the primitives it composes. The kit's entire `execute()` body is under 40 lines of
composition glue; a caller who wants the identical behavior without depending on
`@studnicky/request-executor` at all can hand-compose the same five primitives directly:

<<< ../../packages/request-executor/examples/directComposition.ts#usage

The kit and direct composition produce identical results and use exactly the same five
primitives in exactly the same order — one names the order once inside a reusable class,
the other writes it out inline. Reach for the kit when the same composition repeats across
many call sites; hand-compose when a single call site needs a one-off variant (a different
composition order, an extra primitive spliced in, or no `Context` at all).

## The Boundary Kit

`@studnicky/boundary-kit`'s `BoundaryKit` composes `@studnicky/throttle`,
`@studnicky/resilience`'s `CircuitBreaker`, and `@studnicky/retry` into a fixed-order
"protect a flaky dependency" shape. `BoundaryKit.create()` accepts config for each of the
three composed primitives and returns a kit whose `execute(fn)` runs `fn` through all three
in the fixed order below — see the "Using the kit" example for the full call shape.

Composition order: **throttle (bounds concurrency) → circuitBreaker (fast-fail) → retry
(attempt+backoff) → `fn`** — `throttle.execute(() => circuitBreaker.execute(() =>
retry.execute(fn)))`. Throttle sits outermost because concurrency has to be bounded before a
call is even attempted; the circuit breaker sits next so an already-open circuit
short-circuits before retry burns any attempts against a dependency known to be down; retry
sits innermost, closest to `fn`, so only genuinely transient errors get retried before a
failure reaches the circuit breaker's failure count. Each composed primitive accepts either
a pre-built instance (subclassed or not) or the config shape passed straight to that
primitive's own `create()` — `circuitBreaker` has no zero-arg default of its own, so an
omitted `circuitBreaker` key resolves against `BoundaryKit`'s own default
(`{ failureThreshold: 5, resetTimeoutMs: 30_000 }`).

`Throttle#execute()` resolves `undefined` (rather than rejecting) when the throttle discards
a call via its detach-and-abandon abort behavior; `BoundaryKit#execute()` cannot return
`undefined` as `T`, so it surfaces that discard as a rejected `BoundaryKitAbortedError`
instead.

`BoundaryKit` introduces no hook of its own — every observable stage is already covered by
the composed primitive it delegates to. A caller who needs custom primitive hooks creates
the `Throttle`, `CircuitBreaker`, or `Retry` instance, passes it directly to
`BoundaryKit.create({ throttle, circuitBreaker, retry })`, and retains that original
reference. See
[`@studnicky/retry`](/packages/retry#observability-hooks),
[`@studnicky/resilience`](/packages/resilience#observability-hooks), and
[`@studnicky/throttle`](/packages/throttle#observability-hooks) for each primitive's full
hook table.

### Hand-composing the Boundary Kit without the package

All three primitives are already fully composition-ready on their own, so the identical
`throttle → circuitBreaker → retry → fn` order can be written out inline instead of
depending on `@studnicky/boundary-kit`:

<<< ../../packages/throttle/examples/boundaryKitComposition.ts#usage

Reach for `BoundaryKit` when the same throttle-then-circuit-breaker-then-retry composition
repeats across many call sites and `BoundaryKitAbortedError`'s uniform error surface is
useful; hand-compose when a single call site needs a one-off variant (a different
composition order, an extra primitive spliced in, or direct access to `Throttle#execute()`'s
raw `undefined`-on-discard result).

## The Coordination Kit

The Coordination Kit splits into two independent packages rather than one kit, since a
single kit would force the `event-bus` dependency onto callers who only want keyed
serialization.

### `KeyedWorkGate`: single-flight coalescing falling through to mutex-serialized access

`@studnicky/keyed-work-gate`'s `KeyedWorkGate` composes `@studnicky/mutex`'s `Mutex` and
`@studnicky/concurrency`'s `Coalesce` into two related recipes for a keyed resource:
`runSingleFlight` collapses concurrent same-key callers onto one in-flight execution (via
`Coalesce`), which itself runs under mutex-guarded exclusive access; `runSerialized` skips
coalescing entirely and goes straight to `Mutex` for callers that need every call to
actually execute, just never concurrently for the same key. `KeyedWorkGate.create<TKey>()`
returns a gate whose `runSingleFlight(key, fn)` and `runSerialized(key, fn)` both take the
key and the unit of work as arguments — see the example below for the full call shape.

Composition order for `runSingleFlight`: **`Coalesce.run()` outermost, `Mutex.runExclusive()`
innermost** — a joining caller shares the leader's result without ever touching the mutex
itself; only the leader acquires the lock. This order is not interchangeable with
mutex-first: reversing it would defeat single-flight collapsing, because every caller would
separately queue for the lock before coalescing ever got a chance to join them, so
coalescing would only ever see one queued caller at a time.

`Mutex`'s `timeout` (queue-wait ceiling) and `Coalesce`'s `timeout` (shared in-flight wait
ceiling) together bound how long a caller can wait on either side, so the composition below
never hangs forever on a stuck upstream call.

`KeyedWorkGate` introduces no hook of its own — every observable stage is already covered by
the composed primitive it delegates to. A caller who needs direct primitive observability
creates the `Mutex` or `Coalesce` instance, passes it to `KeyedWorkGate.create(...)`, and
retains the original reference. See [`@studnicky/mutex`](/packages/mutex) and
[`@studnicky/concurrency`](/packages/concurrency) for each primitive's full hook table.

#### Hand-composing `KeyedWorkGate` without the package

<<< ../../packages/mutex/examples/keyedWorkGateComposition.ts#usage

Reach for `KeyedWorkGate` when both `runSingleFlight` and `runSerialized` recipes for the
same key repeat across call sites; hand-compose when a single call site needs only one of
the two recipes, or a different `Coalesce`/`Mutex` composition order for a deliberate reason.

### `BoundedDispatcher`: bounded work dispatch with local event coordination

`@studnicky/bounded-dispatcher`'s `BoundedDispatcher` composes `@studnicky/concurrency`'s
`Semaphore`, `@studnicky/event-bus`'s `EventBus`, and `@studnicky/scheduler`'s
`SchedulerProviderInterface` into a bounded-concurrency dispatch shape: `dispatch()` acquires a
`Semaphore` permit before running the caller's `fn`, publishes `'dispatch'` lifecycle events
(`{ phase: 'start' }` before `fn` runs, then `{ phase: 'success', result }` or
`{ phase: 'error', error }` after it settles) onto a composed `EventBus`, and releases the
permit after the terminal event is published, but always before `dispatch()`'s returned
promise settles. `scheduleDispatch()` layers a `scheduler`-driven
delayed dispatch on top of the same `dispatch()` function, returning the scheduler's own
cancellable task handle. `BoundedDispatcher.create({ permits })` returns a dispatcher whose
`dispatch(fn)` runs `fn` under the bounded semaphore — see the example below for the full
call shape.

`permits` is shorthand for `Semaphore.create({ permits })`. `bus` accepts either a pre-built
`EventBus` instance or `BusQueueOptionsEntity.Type` config (e.g. `{ highWaterMark: 4 }`)
passed straight to `EventBus.create()`. `scheduler` accepts a pre-built
`SchedulerProviderInterface` — defaults to `RealTimeScheduler.create()`, or pass a
`VirtualScheduler` for deterministic test fixtures.

`EventBus.create()` forwards `highWaterMark` into every subscriber's internal `BusQueue`, so
the composition below tunes bus-wide backpressure for a dispatcher's lifecycle events
directly through configuration, with no subclass override of internal `EventBus` wiring
needed.

`BoundedDispatcher` introduces no hook of its own. Permit-level observability stays on
`Semaphore`'s existing hooks (`onAcquire`, `onAcquireWait`, `onContended`, `onRelease`,
`onReleaseDelegated`); dispatch-level observability is the `'dispatch'` topic on a supplied
`EventBus`. Callers retain any pre-built bus or scheduler references passed to
`BoundedDispatcher.create(...)`. See
[`@studnicky/concurrency`](/packages/concurrency),
[`@studnicky/event-bus`](/packages/event-bus), and
[`@studnicky/scheduler`](/packages/scheduler) for each primitive's full hook table.

#### Hand-composing `BoundedDispatcher` without the package

<<< ../../packages/concurrency/examples/boundedDispatcherComposition.ts#usage

Reach for `BoundedDispatcher` when the acquire-before-publish-`start`,
release-exactly-once, publish-before-permit-frees-next-waiter wiring across the three
primitives repeats across call sites — that ordering is easy to get subtly wrong by hand;
hand-compose when a single call site needs a one-off variant of the semaphore/bus/scheduler
wiring.

## The Process Kit

`@studnicky/process-kit`'s `ProcessKit` composes `@studnicky/fsm`'s `StateMachine` and
`EffectInterpreter` with `@studnicky/scheduler`'s `SchedulerProviderInterface` into a
reducer-with-effects shape: a caller-supplied
`StateMachine` subclass owns `getInitialState()`/`reduce()` as the only source of transition
logic, an internally-built `EffectInterpreter` runs the side effects an event produced, a
scheduler drives time-delayed transitions, and callers compose cancellation externally when
needed.
`ProcessKit` does not implement any reducer logic itself. `ProcessKit.create({ machine })`
wraps a caller-built `StateMachine` subclass; `kit.start()` then `kit.dispatch(event)` drive
it — see the example below for the full call shape.

`machine` is the only required field. Configure the optional singular `handler` directly
through `ProcessKit.create({ machine, handler })`; there is no second handler configuration
path. `scheduler` is optional and defaults to `RealTimeScheduler.create()`.

This is the pattern family nearest the Dagonizer boundary — see [Composition
Anti-Patterns](/concepts/composition-anti-patterns#process-kit-orchestration-boundary-risk-flags)
for the specific orchestration-shaped mistakes to avoid when using or hand-composing it.
`ProcessKit`'s own README enforces three of these by convention (no runtime guard — the
discipline is architectural): no chained `scheduleDispatch` calls that branch on the
resulting state to schedule the next step; no registry/lookup of many named `ProcessKit`
instances dispatched into by name; no `save`/`resume` checkpoint pair backed by a store.
The example below respects every one of those risk flags: one flat machine, no
multi-instance registry, no checkpoint/resume.

Composition notes worth calling out explicitly, because the underlying primitives' real
capabilities have a sharp edge here:

- `EffectInterpreter`'s effect handlers receive their own `(effect, dispatch) => void`
  capability, whose `dispatch(event)` enqueues an event at the front of the mailbox and is
  only ever processed **within the same drain cycle** that invoked the handler — genuine
  same-cycle self-advance, with no extra round trip through the caller.
- `ProcessKit#dispatch(event)` is a different thing entirely: it is the public, external
  entry point, and it always goes through the interpreter's real `send()` — the only path
  available once execution is outside that drain cycle.
- A **time-delayed** transition is a different shape from either: by the time a
  `scheduler`-scheduled callback fires, the drain cycle that scheduled it has already ended,
  so the effect-handler `dispatch` capability has no reach past it. `ProcessKit#scheduleDispatch(atMs, event)`
  schedules a callback that fires from the scheduler well after any drain cycle has ended,
  so it correctly calls `dispatch()`/`send()`, never the effect-handler capability. The
  example below uses both mechanisms side by side and names the distinction rather than
  blurring it.
- `VirtualScheduler` gives the example a deterministic, fast-running clock — no real timers,
  no flaky delays.
- Cancellation remains an external composition: create a `Signal` instance, call
  `signal.compose(...)`, then have its `AbortSignal` listener drive a domain `cancel` event
  through `ProcessKit#dispatch()`.
- `TransitionRejectedError` (a reducer's deliberate rejection) and `MachineTerminatedError`
  (an event sent after the machine reached a terminal state) are exercised as distinct,
  `instanceof`-checkable outcomes.

<<< ../../packages/process-kit/examples/observedProcessKit.ts#usage

`ProcessKit` introduces no hook of its own — every observable stage is already covered by
the primitive it delegates to. A caller who subclasses `StateMachine` for its 6
lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`,
`isTerminated`, `onTerminatedAccess`) retains the machine reference; callers likewise retain
any scheduler instance they pass in. See
[`@studnicky/fsm`](/packages/fsm), [`@studnicky/scheduler`](/packages/scheduler), and
[`@studnicky/signal`](/packages/signal) for each primitive's full hook table.

### Hand-composing the Process Kit without the package

<<< ../../packages/fsm/examples/processKitComposition.ts#usage

Reach for `ProcessKit` when the `StateMachine`+`EffectInterpreter`+`scheduler`
wiring repeats across call sites and the `dispatch()`/`scheduleDispatch()` split matters;
hand-compose when a single call site needs a one-off variant of the wiring, or when pulling
in `@studnicky/process-kit` as a dependency isn't worth it for a single reducer.
