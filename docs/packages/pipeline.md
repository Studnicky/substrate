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

Construct a `Pipeline<T>` instance with a fixed array of stages, and run a context
through all of them with `run()`. Each stage receives the context and returns a
(possibly transformed) copy. The stage list is fixed at construction — a different
composition is a different `Pipeline.create()` call with a different array:

<<< ../../packages/pipeline/examples/basic-pipeline.ts#usage

## Pipeline effects in an FSM

<<< ../../packages/pipeline/examples/traffic-light.ts#usage

A Northstar Books checkout endpoint prepares an accepted order before any fulfilment state changes. A fixed pipeline validates the submitted cart, calculates current prices, and selects warehouse routing from the transformed order context. Each stage receives the preceding result, so server code has one typed path for the request data rather than parallel validation, pricing, and routing branches.

The pipeline resolves with the prepared order or rejects at the stage that cannot proceed. It does not decide whether an order is legally preparing, allocated, or shipped; an FSM reducer owns those state transitions. This is a web/server integration pattern, not a claim about output from the runnable demos below.

## Try it

The basic demo constructs a `Pipeline` directly with `Pipeline.create<RequestCtx>([...stages])`. Each stage receives the transformed context from the previous one.

<RunnableExample src="packages/pipeline/examples/basic-pipeline" title="Pipeline stages" />

The hooks demo subclasses `Pipeline` and overrides all eight protected hooks. The failing run emits `stageError` and `runError` with the exact stage error, then rejects with that same value.

<RunnableExample src="packages/pipeline/examples/observedPipeline" title="Pipeline lifecycle hooks" />

## Public API

Use the runtime entry point for the active platform and import type contracts from `@studnicky/pipeline/interfaces`.

## Run an operation through policies

Use `OperationPipeline<TContext>` when a policy surrounds a supplied operation. Interceptors receive the context and `next(context)`. The first declared interceptor enters first, each interceptor decides when to call `next`, each `run()` call chooses its own result type, and the operation result or thrown value passes through unchanged:

<<< ../../packages/pipeline/examples/operation-pipeline.ts#usage

<RunnableExample src="packages/pipeline/examples/operation-pipeline" title="Operation policies" />

## Extending

`beforeStage` and `afterStage` are the transform hooks. Each returns the context passed to the adjacent stage, and an error from either rejects the run. The six lifecycle hooks are observers: `onRunStart`, `onStageStart`, `onStageSuccess`, `onStageError`, `onRunError`, and `onRunComplete`. They receive a detached, deeply frozen context snapshot when context is available and may return `void` or a promise; their return values are ignored, and a throw, rejection, unresolved promise, or snapshot failure never delays, replaces, or changes a stage or run outcome. A context that cannot be cloned skips only that observer while the pipeline continues.

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
