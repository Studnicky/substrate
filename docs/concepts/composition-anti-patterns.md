---
title: Composition Anti-Patterns
description: Concrete anti-patterns to avoid when composing Substrate primitives and patterns — where composition drifts into orchestration.
---

# Composition Anti-Patterns

[Pattern composition](/concepts/pattern-composition) stays substrate-shaped as long as it
stops at "a repeatable runtime shape, still usable without a graph executor." Every
anti-pattern below is a way that boundary gets crossed in practice.

Each entry pairs a concrete "looks like this, don't do this" sketch with the substrate-shaped
alternative. The "don't do this" sketches are boundary illustrations rather than package APIs.

See [Dagonizer Boundary](/concepts/dagonizer-boundary) for the full exclusion list these
anti-patterns are drawn from, and [Lifecycle Hooks](/concepts/lifecycle-hooks) for the hook
idiom that is the *sanctioned* extensibility mechanism referenced throughout.

## A pattern is not a job graph

A pattern composes 2+ primitives into one repeatable shape for **one** unit of work. It is
not a workflow DSL, a persisted process manager, or an application framework — see [Layer 2:
Patterns](/packages/request-executor) and the non-goals listed under each of the 8 pattern
families.

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing — describes a mistake to avoid, not a real API -->
```typescript
// DON'T: a pattern kit that accepts a declarative graph of steps and walks it
class RequestPipeline {
  addStep(name: string, fn: () => Promise<unknown>, dependsOn: string[]): this { /* ... */ return this; }
  async run(): Promise<Map<string, unknown>> { /* topologically sorts and executes steps */ return new Map(); }
}
```

The moment a "pattern" needs a `dependsOn` list and does its own topological sort, it has
become a DAG resolver — Dagonizer's job, not substrate's (see [Dagonizer
Boundary](/concepts/dagonizer-boundary)).

<!-- inline-ts-ok: illustrative correct shape paired with the anti-pattern above, no runnable backing -->
```typescript
// DO: compose the pattern once per unit of work, and let the caller sequence calls
const userResult = await requestExecutor.execute((client, signal) => client.get('/user', { signal }));
const ordersResult = await requestExecutor.execute((client, signal) => client.get('/orders', { signal }));
```

If the caller genuinely needs `ordersResult` to depend on `userResult` across a graph of
many such calls with retry/checkpoint semantics of its own, that dependency graph belongs in
Dagonizer, not in a loop of pattern calls glued together by hand inside substrate.

## A facade must not become an opaque wrapper

Every facade in substrate accepts pre-built composed primitives where callers need custom
subclasses. Callers keep their own references to those instances. A facade that only accepts
flattened configuration prevents composition with package-owned subclass hooks and becomes
the hidden runtime this layer forbids.

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing -->
```typescript
// DON'T: config-only construction with no escape hatch to the wrapped instances
class OpaqueExecutor {
  private constructor(config: { baseURL: string; maxRetries: number }) { /* builds FetchClient and Retry internally, never exposed */ }
  static create(config: { baseURL: string; maxRetries: number }): OpaqueExecutor { return new this(config); }
  async execute<T>(fn: (client: unknown) => Promise<T>): Promise<T> { throw new Error('not implemented'); }
  // A caller cannot supply a subclassed FetchClient or Retry.
}
```

<<< ../../packages/request-executor/examples/observedRequestExecutor.ts#usage

`RequestExecutor` accepts pre-built `FetchClient`, `Retry`, `Timing`, and `Context`
instances. The caller retains those original references for direct lifecycle observation;
the facade does not clone or wrap them.

## Process Kit orchestration-boundary risk flags

The (documentation-only) Process Kit — `fsm` + `pipeline` + `scheduler` + `signal` — sits
nearest the Dagonizer boundary of the four pattern families, because a reducer-with-effects
shape is genuinely one step away from a workflow engine. Four specific risk flags apply when
hand-composing it:

### `scheduleDispatch` chaining

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing -->
```typescript
// DON'T: chain scheduleDispatch calls against interdependent state transitions
scheduler.schedule(1000, async () => {
  const state1 = await interpreter.dispatch({ type: 'STEP_ONE' });
  if (state1.status === 'ready') {
    scheduler.schedule(2000, async () => {
      const state2 = await interpreter.dispatch({ type: 'STEP_TWO' });
      if (state2.status === 'ready') {
        scheduler.schedule(3000, () => interpreter.dispatch({ type: 'STEP_THREE' }));
      }
    });
  }
});
```

This is hand-rolling a workflow scheduler on top of the primitive — each nested
`scheduler.schedule` call is a step in an implicit graph, and the graph only exists in the
call-stack shape of this code, invisible to anything else. Do this instead: let a **single**
`StateMachine` own the sequencing as ordinary transitions, and let `EffectInterpreter` drive
timed effects through its own effect-descriptor return values (see
[`@studnicky/fsm`](/packages/fsm) and [`@studnicky/scheduler`](/packages/scheduler)) — one
flat machine, not a pyramid of scheduled callbacks each dispatching the next.

### Branching `settlePipeline`

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing -->
```typescript
// DON'T: branch on transition outcome, or fan out to multiple machines
async function settlePipeline(state: OrderState): Promise<void> {
  if (state.status === 'paid') {
    await Promise.all([
      shippingMachine.dispatch({ type: 'ORDER_PAID' }),
      notificationMachine.dispatch({ type: 'ORDER_PAID' }),
      inventoryMachine.dispatch({ type: 'ORDER_PAID' })
    ]);
  }
}
```

A post-transition projection step must stay a **linear, single-machine** projection —
reading the new state and shaping it for a caller, nothing more. Branching on the outcome to
decide which of several other machines to notify is graph fan-out, the same
`DAGLifecycleMachine` shape [Dagonizer Boundary](/concepts/dagonizer-boundary) reserves for
Dagonizer. Do this instead: keep one `Pipeline` transforming one machine's state, and if
multiple independent processes genuinely need to react to the same event, publish it on
`@studnicky/event-bus` and let each subscriber decide independently — coordination, not
orchestration.

### Multi-instance registries

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing -->
```typescript
// DON'T: a registry/lookup of many named process instances
class ProcessRegistry {
  private readonly processes = new Map<string, ProcessKit<unknown, unknown>>();
  register(name: string, kit: ProcessKit<unknown, unknown>): void { this.processes.set(name, kit); }
  dispatch(name: string, event: unknown): Promise<unknown> { return this.processes.get(name)!.dispatch(event); }
}
```

A registry of named process instances that other code looks up and dispatches into by name
is node-placement — exactly the concern [Dagonizer Boundary](/concepts/dagonizer-boundary)
assigns to Dagonizer's graph-node lifecycle FSM. Do this instead: keep each process instance
a plain local variable the caller already holds a reference to; if the caller genuinely needs
to address many named processes dynamically, that addressing is Dagonizer's job.

### Checkpoint/resume creep

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing -->
```typescript
// DON'T: persist state so a process can resume after a restart
async function stop(): Promise<void> {
  await store.save(this.machine.state); // <- durable persistence creeping into stop()
}
async function resume(id: string): Promise<void> {
  const savedState = await store.load(id);
  this.machine.restoreState(savedState);
}
```

`stop()`/teardown on any in-memory process composition must stay in-memory only. The moment
it grows a `save`/`resume` pair backed by a store, it has become the checkpoint/resume
concern [Dagonizer Boundary](/concepts/dagonizer-boundary) reserves for Dagonizer's
`dagonizer-store-*` packages. Do this instead: if a caller needs durability, that is the
signal to stop composing substrate primitives for this process and hand the workflow to
Dagonizer.

## The interceptor pattern is forbidden at this layer too

[Lifecycle Hooks](/concepts/lifecycle-hooks) already forbids the interceptor pattern for
primitives: no externally-injected function or array of functions stored and run as a
pipeline/chain to transform a flowing context or drive behavior. That prohibition applies
with equal force to any future pattern kit — a kit is not exempt just because it sits one
layer up.

<!-- inline-ts-ok: illustrative anti-pattern shape, no runnable backing -->
```typescript
// DON'T: an externally-injected middleware/interceptor chain as the extensibility mechanism
class InterceptedExecutor {
  private readonly interceptors: Array<(ctx: unknown, next: () => Promise<unknown>) => Promise<unknown>> = [];
  use(interceptor: (ctx: unknown, next: () => Promise<unknown>) => Promise<unknown>): this {
    this.interceptors.push(interceptor);
    return this;
  }
  async execute(ctx: unknown): Promise<unknown> {
    const chain = this.interceptors.reduceRight(
      (next, interceptor) => () => interceptor(ctx, next),
      async () => ctx
    );
    return chain();
  }
}
```

This is the exact shape [Lifecycle Hooks](/concepts/lifecycle-hooks) rules out for
primitives — an array of externally-supplied functions run as a chain — and it does not
become acceptable by moving up to the pattern-kit layer. A future pattern kit's only
extensibility mechanisms, in the [Configuration Preference
Order](/concepts/lifecycle-hooks), are: the protected lifecycle hooks already exposed by
each composed primitive, explicit configuration of those primitives, or direct use of the
primitives by the caller (the [pattern composition](/concepts/pattern-composition) guide's
"compose directly without the kit" section). Do this instead — subclass the composed
primitive and override its hook, the same idiom `RequestExecutor` relies on for every
observable stage:

<<< ../../packages/request-executor/examples/observedRequestExecutor.ts#usage

`RequestExecutor` itself has no hooks of its own precisely because every observable stage is
already covered by a composed primitive's hook (`FetchClient#onRequest`/`onResponse`,
`Retry#onAttempt`/`onRetryScheduled`/`classifyError`, `Timing#onEvent`,
`Context#onBeforeExecute`/`onAfterExecute`). A future pattern kit should follow the same
rule: add a hook of its own only for a stage no composed primitive's hook already covers,
and never accept a caller-supplied array of behavior-shaping callbacks as a substitute.
