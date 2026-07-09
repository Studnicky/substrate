---
title: Architecture
description: The three design principles behind every Substrate primitive.
---

# Architecture

Every Substrate class is designed around three principles. Together they ensure every primitive is safe to use directly and safe to subclass, with no coupling to any external infrastructure.

## 1. Subclass-first seams

Public methods delegate to documented protected seams with no-op defaults where observation is needed. A typical passive hook pattern is:

```
public method(args) {
  this.onBefore(args);      // protected hook (no-op default)
  const result = doWork();
  this.onAfter(result);     // protected hook (no-op default)
  return result;
}
```

A consumer subclasses and overrides only the hooks they care about:

<!-- inline-ts-ok: conceptual subclass-seam illustration using the published @studnicky/throttle import and an external metrics sink; demonstrates the principle, not an in-repo runnable example -->
```typescript
import { Throttle } from '@studnicky/throttle';

class MeteredThrottle extends Throttle {
  protected override onExecuteStart(): void {
    metrics.increment('throttle.active');
  }

  protected override onExecuteComplete(): void {
    metrics.decrement('throttle.active');
  }
}
```

The seam is explicit: the base class documents every hook in JSDoc. There are no magic interception points; every extension site is a named method. Some seams are passive observer hooks; others are in-band behavioral hooks that transform, classify, or intercept the operation itself.

## 2. No observability in bare classes

The base class never calls a logger, never emits a metric, never references an external service. Passive observer hooks are no-ops; the consumer overrides them to add whatever observability their system uses.

This means you can instantiate any class directly in a test without mocking an injected logger:

<!-- inline-ts-ok: conceptual two-line illustration with an undefined doWork() placeholder; demonstrates zero-setup instantiation, not an in-repo runnable example -->
```typescript
// Zero setup, zero mocks
const retry = Retry.create({ maxRetries: 3 });
await retry.execute(async () => doWork());
```

In production, extend once per application boundary; the extension carries the logger reference:

<!-- inline-ts-ok: conceptual production-extension illustration with an external Logger dependency; demonstrates the boundary pattern, not an in-repo runnable example -->
```typescript
class AppRetry extends Retry {
  constructor(private readonly log: Logger) {
    super({ maxRetries: 5 });
  }

  protected override onGiveUp(ctx: RetryContextInterface, error: Error): void {
    this.log.error({ ctx, error }, 'retry exhausted');
  }
}
```

Substrate does not impose one global hook-error policy across every seam. Observer hooks exist to observe committed work and are documented as such. Behavioral hooks stay in-band and may intentionally alter or fail the operation. The contract is per hook, not global.

## 3. No exported singletons

Every stateful class is `new`-able and injectable. Static helpers on domain classes are pure-static utility classes with no module-level mutable state:

<!-- inline-ts-ok: conceptual cross-package overview contrasting stateful constructors with pure-static utilities; spans many packages, not a single in-repo runnable example -->
```typescript
// Stateful: new-able, injectable
const retry   = Retry.create({ maxRetries: 3 });
const mutex   = Mutex.create<string>({ timeout: 5000 });
const context = Context.create({ name: 'request' });

// Pure-static utilities: no state
const merged  = Merge.deep(base, overlay);
const cloned  = Clone.deep(original);
const hashed  = Hash.fnv32(value);
```

Stateful classes expose an explicit FSM funnel through `transition()`. All state changes flow through a single point, with no scattered `this.state = ...` assignments:

<!-- inline-ts-ok: conceptual one-line illustration of the transition() funnel on an undefined fsm instance; demonstrates the funnel principle, not an in-repo runnable example -->
```typescript
// State transitions are guarded and logged via a single funnel
fsm.transition('draining');   // throws if the transition is illegal
```

Protected `guard()` and `onEnter()` hooks let you intercept transitions without subverting the state machine:

<!-- inline-ts-ok: conceptual method-override fragment (bare guard()/onEnter() bodies outside any class); demonstrates the interception seam, not an in-repo runnable example -->
```typescript
protected override guard(from: string, to: string): boolean {
  if (to === 'draining' && this.activeCount > 0) return false;
  return super.guard(from, to);
}

protected override onEnter(to: string, from: string): void {
  this.log.info({ from, to }, 'state changed');
}
```

## Package families

The 43 packages split into two families. Stateful primitives hold runtime state and expose a lifecycle; stateless utilities are pure functions or static method collections with no instances. See the [Packages Index](/packages/) for the full, current per-package list within each group below.

```mermaid
flowchart TD
    subgraph Stateful["Stateful (subclass-first, FSM-backed)"]
        direction LR
        C["Concurrency\nRetry · Throttle · Mutex · Batch\nConcurrency · File-Lock\nIdempotency-Guard · Memoize\nBounded-Dispatcher · Keyed-Work-Gate\nKeyed-Rate-Limiter"]
        T["Time\nClock · Scheduler · Timing"]
        S["State & Flow\nContext · FSM · Pipeline · Paginator\nProcess-Kit · Visible-Range · Flag-Evaluator"]
        O["I/O & Observability\nEvent-Bus · Fetch · Logger · Errors\nRequest-Executor · Resilience\nSliding-Window-Limiter · Boundary-Kit\nHealth-Registry · System · Worker-Pool"]
    end
    subgraph Stateless["Stateless (pure / type-only)"]
        direction LR
        D["Data\nCache · Entity-Store · JSON\nPredicates · Types · Config"]
        B["Buffers\nCircular-Buffer · Sample-Buffer"]
        F["Foundation\nESLint Config"]
    end
    Consumer["Consumer code"] -->|"extends or new"| Stateful
    Consumer -->|"static call"| Stateless
```

Text equivalent of the diagram above (for readers without diagram rendering): consumer code either subclasses/instantiates a **stateful** primitive or makes a **static call** into a **stateless** utility. Stateful primitives group into Concurrency (`retry`, `throttle`, `mutex`, `batch`, `concurrency`, `file-lock`, `idempotency-guard`, `memoize`, `bounded-dispatcher`, `keyed-work-gate`, `keyed-rate-limiter`), Time (`clock`, `scheduler`, `timing`), State & Flow (`context`, `fsm`, `pipeline`, `paginator`, `process-kit`, `visible-range`, `flag-evaluator`), and I/O & Observability (`event-bus`, `fetch`, `logger`, `errors`, `request-executor`, `resilience`, `sliding-window-limiter`, `boundary-kit`, `health-registry`, `system`, `worker-pool`). Stateless utilities group into Data (`cache`, `entity-store`, `json`, `predicates`, `types`, `config`), Buffers (`circular-buffer`, `sample-buffer`), and Foundation (`eslint-config`).

## FSM overview

A representative lifecycle for a stateful primitive:

```mermaid
stateDiagram-v2
  [*] --> idle : create()
  idle --> active : execute()
  active --> active : execute() [slots available]
  active --> draining : drain()
  draining --> done : last op completes
  active --> aborted : abort()
  draining --> aborted : abort()
  done --> [*]
  aborted --> [*]

  note right of active
    guard() rejects illegal transitions
    onEnter() fires on every entry
  end note
```

Text equivalent of the diagram above (for readers without diagram rendering): starts in `idle` on `create()`. `execute()` moves `idle` to `active`, and repeated `execute()` calls keep it in `active` while slots are available. `drain()` moves `active` to `draining`; `draining` reaches `done` once the last operation completes. `abort()` moves either `active` or `draining` to `aborted`. `done` and `aborted` are both terminal states. Throughout, `guard()` rejects illegal transitions and `onEnter()` fires on every state entry.

Transitions that violate the guard throw immediately; the FSM never enters an inconsistent state.
