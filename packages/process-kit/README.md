# @studnicky/process-kit

> Reducer-with-effects process pattern composing `@studnicky/fsm`, `@studnicky/scheduler`, and `@studnicky/signal`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/process-kit)

Composes three substrate primitives into the "local process as explicit state plus scheduled transitions" pattern: a caller-supplied `StateMachine` subclass is wired to an internally-built `EffectInterpreter`, a `SchedulerProviderType` (real-time by default, or a `VirtualScheduler` for deterministic tests), and a `Signal` for cancellation composition. `ProcessKit` does not implement any reducer logic itself — the caller's `StateMachine` subclass owns `getInitialState()`/`reduce()` and stays the only source of transition logic.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/process-kit
```

## Usage

```typescript
import { ProcessKit } from '@studnicky/process-kit';

const kit = ProcessKit.create({ machine: new JobProcess() });

kit.start();
const state = await kit.dispatch({ type: 'start' });
```

`machine` is the only required field — `ProcessKit` always wraps a caller-built `StateMachine` subclass, never invents a reducer. `handlers` (effect handlers), `scheduler`, and `signal` are all optional and defaulted internally (`RealTimeScheduler.create()`, `Signal.create()`).

See `examples/observedProcessKit.ts` for the full runnable version, including a scheduled time-delayed transition and Signal-driven cancellation.

## Transparency

`ProcessKit` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to:

| Getter | Returns |
|--------|---------|
| `getMachine()` | The composed `StateMachine` instance |
| `getInterpreter()` | The composed `EffectInterpreter` instance |
| `getScheduler()` | The composed `SchedulerProviderType` instance |
| `getSignal()` | The composed `Signal` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper. A caller who subclassed `StateMachine` for its 6 lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`, `isTerminated`, `onTerminatedAccess`) keeps full access to those hooks; `EffectInterpreter`'s 9 hooks and the scheduler's own hooks remain reachable the same way through `getInterpreter()`/`getScheduler()`.

## `dispatch()` vs. the effect-handler `dispatch` capability

`EffectInterpreter`'s effect handlers receive their own `(effect, dispatch) => void` capability, whose `dispatch(event)` enqueues an event at the front of the mailbox and is only ever processed within the **same drain cycle** that invoked the handler. `ProcessKit#dispatch(event)` is a different thing entirely: it is the public, external entry point, and it always goes through the interpreter's real `send()` — the only path available once execution is outside that drain cycle. `ProcessKit#scheduleDispatch(atMs, event)` schedules a callback that fires from the scheduler well after any drain cycle has ended, so it correctly calls `dispatch()`/`send()`, never the effect-handler capability.

## Anti-Patterns

`ProcessKit` sits nearest the Dagonizer orchestration boundary of substrate's pattern kits — a reducer-with-effects shape is genuinely one step away from a workflow engine. Three boundaries are enforced by convention (there is no runtime guard against them — the discipline is architectural):

1. **`scheduleDispatch` chaining** — do not nest `scheduleDispatch` calls that branch on the resulting state to schedule the next step. That is hand-rolling a workflow scheduler on top of the kit. Let a single `StateMachine` own sequencing as ordinary transitions, and let effect descriptors (not chained callbacks) express timed follow-ups.
2. **Multi-instance registries** — do not build a registry/lookup of many named `ProcessKit` instances that other code dispatches into by name. That is node-placement, which belongs to Dagonizer. Keep each `ProcessKit` a plain local variable the caller already holds a reference to.
3. **Checkpoint/resume creep** — `stop()`/teardown must stay in-memory only. Do not add a `save`/`resume` pair backed by a store; that is Dagonizer's `dagonizer-store-*` concern.

See [Composition Anti-Patterns](../../docs/concepts/composition-anti-patterns.md) (Process Kit orchestration-boundary risk flags) and [Substrate vs. Dagonizer Boundary](../../docs/concepts/dagonizer-boundary.md) for the full rationale.

## Extending

Subclass `ProcessKit` to add convenience behavior that reaches the composed instances through the getters — `ProcessKit` has no lifecycle hooks of its own to override. Subclass `StateMachine` to add transition observability; subclass the scheduler to add scheduling observability. Those hooks fire exactly as they would standalone.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/process-kit

## License

MIT
