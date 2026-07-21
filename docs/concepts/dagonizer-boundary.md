---
title: Substrate vs. Dagonizer Boundary
description: What substrate owns, what Dagonizer owns, and a 5-question gate for deciding which side of the line a new package or API belongs on.
---

# Substrate vs. Dagonizer Boundary

Dagonizer (`../Dagonizer`) is a **sibling workspace project**, not a substrate package.
Substrate feeds Dagonizer — primitives, patterns, and thin facades it can compose — and
never clones what Dagonizer already owns: task graphs, workflow scheduling, dependency
graphs, retries across graph nodes, and execution plans.

Substrate stays focused on runtime primitives, composition patterns, deterministic test
seams, observability seams, and type-safe contracts between primitives. It does not become
a task runner, a workflow engine, a graph orchestrator, or a persistence framework. See
[Pattern Composition](/concepts/pattern-composition) for what substrate *does* own at its
highest layer today, and [Composition Anti-Patterns](/concepts/composition-anti-patterns)
for the specific ways composition drifts toward the line this page draws.

## The exclusion list

Each item below belongs to Dagonizer rather than substrate.

- **Node dependency graph / DAG resolution** — Dagonizer core. Substrate has no node/edge
  graph model; `@studnicky/pipeline` is a linear sequential context transform, not a DAG.
- **Cross-node retry/backoff orchestration** — Dagonizer. `@studnicky/retry` retries one
  async call; it has no concept of a "node" or graph-scoped retry policy propagation.
- **Deterministic checkpoint/resume of multi-step execution** — Dagonizer
  (`dagonizer-store-*` packages). Substrate has no durable/replayable execution state;
  `@studnicky/context` is ephemeral and request-scoped only.
- **Graph-node lifecycle FSM** (Dagonizer's `DAGLifecycleMachine`) — Dagonizer.
  `@studnicky/fsm` is a pure reducer plus async effect interpreter for a single
  actor/process, with no notion of node placement, fan-out, or graph-position state.
- **Task/job scheduling across dependent work items** — Dagonizer. `@studnicky/scheduler`
  provides real-time/virtual timer primitives only, not dependency-aware task ordering.
- **Persistent Store abstraction** (eventlog, sqlite, IndexedDB, OPFS, webstorage) —
  Dagonizer (`dagonizer-store-*`). `@studnicky/cache` and `@studnicky/virtual-fs` are
  process-local and ephemeral; substrate has no durable Store contract.
- **Isolating executor backends** (worker threads, fork, cluster, spawn bridge) — Dagonizer
  (`dagonizer-executor-*`). `@studnicky/concurrency`/`@studnicky/mutex` coordinate
  in-process async work only.
- **JSON-LD canonical wire format / schema validation for graph state** — Dagonizer.
  `@studnicky/json` is a generic parse/stringify/utility toolkit, not a semantic
  wire-format or DAG schema layer.
- **Adapter/embedder/tool plugin tiers** (LLM backends, vector backends, concrete tools) —
  Dagonizer (`dagonizer-adapter-*`, `-embedder-*`, `-tool-*`). Substrate has no plugin-tier
  or domain-adapter concept.
- **Fan-out/pattern abstractions bound to graph nodes** (RAG, graph, flow patterns) —
  Dagonizer (`dagonizer-patterns-*`). Substrate's [8 pattern
  families](/concepts/pattern-composition) are primitive compositions usable without a
  graph executor, never node-typed or DAG-aware.
- **Event-bus as a durable event-sourced log** — Dagonizer (`dagonizer-store-eventlog`).
  `@studnicky/event-bus` is typed in-memory pub/sub with backpressure, not an append-only
  persisted history.
- **State-scoped child-actor lifecycle** (`invoke`, spawn/stop tied to a named node) —
  Dagonizer (`DAGLifecycleMachine`). Substrate's `@studnicky/fsm` stays a single-machine
  reducer with no child-actor spawning.
- **Actor-model message-passing between named actors** (supervision, `sendTo`) — Dagonizer.
  A supervision tree is graph structure, and routing between named actors is node-to-node
  communication. Substrate's ceiling for inter-machine coordination stays
  `@studnicky/event-bus`.

Window-focus refetch, network-reconnect refetch, and offline/network-mode handling are out
of scope for substrate at every layer. They assume a runtime-specific connectivity source
(browser `navigator.onLine` or Node interface polling), which violates the rule that
substrate primitives do not assume storage, transport topology, or application architecture.

## The 5-question gate

Before adding a new package or API to substrate, ask:

1. Is this still a primitive or a pattern, or has it become orchestration?
2. Can it be expressed as a small composition over existing substrate packages?
3. Does it require durable state to be useful?
4. Does it imply graph scheduling or dependency resolution?
5. Would Dagonizer be the more correct home?

**If the answer to 3, 4, or 5 is yes, it does not land in substrate.**

### Worked examples

| Proposal | Q3 durable? | Q4 graph/scheduling? | Q5 Dagonizer's home? | Verdict |
|---|---|---|---|---|
| A one-shot request execution pattern composing `fetch`+`retry`+`signal`+`timing`+`context` | No | No | No | Substrate — `@studnicky/request-executor` |
| A `throttle` → `CircuitBreaker` → `retry` boundary-protection recipe | No | No | No | Substrate — `@studnicky/boundary-kit` |
| A reducer-with-effects process built from `fsm`+`scheduler` | No, while `stop()` stays in-memory only | No, while transitions stay single-machine and linear | No, while the kit never grows a named-instance registry | Substrate — `@studnicky/process-kit`, nearest the line (see [anti-pattern risk flags](/concepts/composition-anti-patterns)) |
| A cursor/page-list tracker for paginated data sources | No — caller supplies fetched pages, tracker holds no fetch logic | No | No | Substrate — `@studnicky/paginator` |
| A dependency graph of retry-protected calls that resume from a checkpoint after a crash | Yes (checkpoint) | Yes (dependency graph) | Yes | Dagonizer |
| A registry that dispatches events to any of several named, independently-addressable state machines | Depends | Yes — that addressing is node-placement | Yes | Dagonizer |
| A plugin tier that swaps in different LLM/vector/tool backends behind one interface | No | No | Yes — `dagonizer-adapter-*`/`-embedder-*`/`-tool-*` already own this | Dagonizer |

## What "feeds, never clones" means in practice

Substrate's job is to make sure Dagonizer never has to reinvent a primitive-level concern —
retry policy, cancellation composition, backpressure-aware queues, deterministic test
scheduling — from scratch. When Dagonizer needs one of those, it depends on the substrate
package the same way any other consumer would. Substrate does not, in turn, grow
graph-shaped or workflow-shaped features just because Dagonizer's domain touches similar
words ("retry," "state," "schedule") — the exclusion list above exists precisely because
those words mean something different once a node, a graph, or durability enters the
picture.
