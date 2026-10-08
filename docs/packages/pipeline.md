---
title: "@studnicky/pipeline"
description: Generic typed async pipeline for sequential context transforms.
---

# @studnicky/pipeline

> Generic typed async pipeline for sequential context transforms.

## Install

```bash
pnpm add @studnicky/pipeline
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Runtime imports

Import `Pipeline` and `OperationPipeline` from `@studnicky/pipeline/node` in Node or `@studnicky/pipeline/browser` in browsers. Import type contracts from `@studnicky/pipeline/interfaces`.

## Usage

Say a Northstar Books order needs to pass through the same two steps every time before it's ready to fulfil: work out what it costs, then decide which warehouse route it ships from. `Pipeline<T>` lets you nail that sequence down once as a fixed array of stages and run any order through all of them with a single `run()` call. Each stage hands its result to the next, so the order below arrives at the routing stage already priced, without that stage ever needing to know how the price got there. The stage list is fixed at construction — a different composition is a different `Pipeline.create()` call with a different array:

<<< ../../packages/pipeline/examples/basic-pipeline.ts#usage

## Pipeline effects in an FSM

This is where `@studnicky/fsm` and `@studnicky/pipeline` meet: a fulfilment machine moves a Northstar Books order from draft to processing by emitting a pipeline effect, and the interpreter runs that pipeline — validate, then price, then route — before feeding the resulting event back to the reducer. The reducer never runs the pipeline itself, and the pipeline never decides the order's state; it only confirms all three stages actually ran before the order is allowed to move on to ready-to-ship.

<<< ../../packages/pipeline/examples/traffic-light.ts#usage

A Northstar Books checkout endpoint prepares an accepted order before any fulfilment state changes. A fixed pipeline validates the submitted cart, calculates current prices, and selects warehouse routing from the transformed order context. Each stage receives the preceding result, so server code has one typed path for the request data rather than parallel validation, pricing, and routing branches.

The pipeline resolves with the prepared order or rejects at the stage that cannot proceed. It does not decide whether an order is legally preparing, allocated, or shipped; an FSM reducer owns those state transitions. This is a web/server integration pattern, not a claim about output from the runnable demos below.

## Try it

Run the Northstar order through its pricing-then-routing pipeline live and watch the context grow more complete at each stage — the same `Pipeline.create([...stages])` pattern shown above, now executing end to end with real assertions on the final price and route.

<RunnableExample src="packages/pipeline/examples/basic-pipeline" title="Pipeline stages" />

Subclass `Pipeline` and override every one of its eight hooks, and you get a blow-by-blow trace of a run — which stage started, which succeeded, and in a run built to fail, exactly where it broke. This demo runs both: a clean three-stage pipeline where every stage starts and succeeds in order, then a two-stage pipeline where the second stage throws, so you can watch `stageError` and `runError` fire with that same error before it propagates out of `run()` unchanged.

<RunnableExample src="packages/pipeline/examples/observedPipeline" title="Pipeline lifecycle hooks" />

## Public API

Use the runtime entry point for the active platform and import type contracts from `@studnicky/pipeline/interfaces`.

## Run an operation through policies

Sometimes the thing moving through a pipeline isn't data being transformed stage by stage — it's a policy wrapping around someone else's operation, like a Northstar Books request log wrapping around whatever actually serves the request. `OperationPipeline<TContext>` is built for that: each interceptor receives the context and a `next(context)` it decides when to call. Below, one interceptor logs before and after it calls `next`, which runs the supplied operation and hands its result straight back through — untouched, whatever type it happens to be:

<<< ../../packages/pipeline/examples/operation-pipeline.ts#usage

Run it live to see the `starting`/`completed` log lines bracket the operation call, with the handled result passing back out unchanged.

<RunnableExample src="packages/pipeline/examples/operation-pipeline" title="Operation policies" />

## Extending

Two of Pipeline's hooks aren't just observers — `beforeStage` and `afterStage` actually transform the context, and throwing from either rejects the whole run. The example below puts both to work: `onRunStart` stamps a start time, and `afterStage` uses it to attach how many milliseconds the stage took directly onto the context flowing to the next stage, alongside a plain stage that adds an `Authorization` header — a transform hook and a plain stage cooperating in one pipeline. The six remaining lifecycle hooks are pure observers: `onRunStart`, `onStageStart`, `onStageSuccess`, `onStageError`, `onRunError`, and `onRunComplete`. They receive a detached, deeply frozen context snapshot when context is available and may return `void` or a promise; their return values are ignored, and a throw, rejection, unresolved promise, or snapshot failure never delays, replaces, or changes a stage or run outcome. A context that cannot be cloned skips only that observer while the pipeline continues.

<<< ../../packages/pipeline/examples/subclass-hooks.ts#usage

The `stages` getter returns a readonly snapshot of all constructed transforms, useful for inspection or tooling.

## Observability hooks

| Hook                         | When it fires                                                       | Args                                |
| ---------------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| `onRunStart(ctx)`            | Before the first stage.                                             | `ctx: Readonly<T>`                  |
| `beforeStage(ctx, index)`    | Before each stage; return value becomes the stage input.            | `ctx: T`, `index: number`           |
| `onStageStart(index, ctx)`   | After `beforeStage`, before the stage.                              | `index: number`, `ctx: Readonly<T>` |
| `onStageSuccess(index, ctx)` | After a stage succeeds, before `afterStage`.                        | `index: number`, `ctx: Readonly<T>` |
| `afterStage(ctx, index)`     | After each stage; return value becomes the next context.            | `ctx: T`, `index: number`           |
| `onStageError(index, error)` | When a stage throws, before the same value propagates.              | `index: number`, `error: unknown`   |
| `onRunError(error)`          | When a stage error propagates out of `run()`, after `onStageError`. | `error: unknown`                    |
| `onRunComplete(ctx)`         | After all stages complete.                                          | `ctx: Readonly<T>`                  |

The same tracing subclass used in the demo above makes every row in this table concrete — run it to match each hook name to the exact log line it produces, on both the successful run and the one that fails.

<<< ../../packages/pipeline/examples/observedPipeline.ts#usage

## Interfaces

`@studnicky/pipeline/interfaces` exports pipeline stage, operation, interceptor, and injectable operation-pipeline contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type {
  OperationFunctionInterface,
  OperationInterceptorInterface,
  OperationPipelineInterface,
  PipelineFunctionInterface,
} from "@studnicky/pipeline/interfaces";
```

## What it is

`@studnicky/pipeline` is a typed asynchronous composition primitive for sequential context transforms and operation interceptors. It supplies the execution boundary and observation hooks; it does not prescribe an order workflow, state model, policy set, or application service.

## What it is for

Northstar Books uses a pipeline where a single request context must move through a known sequence, such as cart validation, price calculation, and warehouse selection. It uses operation interceptors where cross-cutting policies surround an operation. Node and browser are runtime-specific alternatives; the `fsm` subpaths compose a state-machine primitive with pipeline effects, and the interfaces subpaths define contracts for Northstar-owned stages and adapters.

## Northstar Books examples

- **Pipeline stages** solves the “prepare one checkout request consistently” problem. It carries the order context through fixed validation, pricing, and fulfilment transforms, proving that each step receives the previous step’s typed result.
- **Pipeline lifecycle hooks** solves the “observe a failed catalogue-import preparation without changing its result” problem. It records stage and run events around a failing operation, proving that observability does not replace the original failure.
- **Operation policies** solves the “apply Northstar’s authorization and audit policies around a stock-reservation operation” problem. It composes interceptors around a supplied operation, proving that policy order and operation ownership remain explicit.

## Public entrypoints

| Import path                          | Use it when                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `@studnicky/pipeline/node`           | Northstar runs typed transformation stages or operation interceptors in a Node service.                                          |
| `@studnicky/pipeline/browser`        | Northstar runs the same browser-safe pipeline primitive in a reader or bookseller interface.                                     |
| `@studnicky/pipeline/interfaces`     | Northstar defines stages, operations, interceptors, or injectable pipeline ports without tying them to a service implementation. |
| `@studnicky/pipeline/fsm`            | Northstar composes pipeline effects with finite-state-machine transitions for a domain process it owns.                          |
| `@studnicky/pipeline/fsm/interfaces` | Northstar types its own pipeline-aware state-machine contracts.                                                                  |
| `@studnicky/pipeline/fsm/entities`   | Northstar validates pipeline-aware state-machine data at its application boundary.                                               |

## Exports

| Symbol                       | Purpose                                               | Import path                      |
| ---------------------------- | ----------------------------------------------------- | -------------------------------- |
| `OperationPipeline`          | Runs a supplied operation through typed interceptors. | `@studnicky/pipeline/node`       |
| `OperationPipelineInterface` | Injectable operation-policy contract.                 | `@studnicky/pipeline/interfaces` |
| `Pipeline`                   | Runs typed transformation stages in sequence.         | `@studnicky/pipeline/node`       |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/pipeline)
