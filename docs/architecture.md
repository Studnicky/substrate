---
title: Architecture
description: The public-path, ownership, and extension contracts behind Substrate primitives.
---

# Architecture

Substrate primitives follow one public entrypoint convention and one ownership model. Runtime behavior uses `/node` or `/browser`; schemas and contracts use `/entities` and `/interfaces`. Stateful classes use a direct factory and direct operation methods, and protected seams support application-specific behavior without infrastructure coupling.

## 1. Public entrypoints

Consumers use one canonical sequence:

1. Import runtime behavior from `@studnicky/<package>/node` or `@studnicky/<package>/browser`, and import runtime-neutral schemas or contracts from `/entities` or `/interfaces`.
2. Construct a stateful primitive through `Class.create(config)`.
3. Invoke its direct operation methods.

<!-- inline-ts-ok: conceptual Node-entrypoint and direct-construction example -->

```typescript
import { Retry } from "@studnicky/resilience/retry/node";

const retry = Retry.create({ maximumRetries: 3 });
const result = await retry.execute(async () => loadRecord());
```

Runtime entrypoints and direct factories define the public API. Protected constructors keep creation inside the factory path while allowing inherited factories to construct subclasses.

## 2. Subclass-first seams

Public methods delegate to documented protected seams. Passive observer hooks have no-op defaults; behavioral seams transform, classify, or intercept an operation in-band.

<!-- inline-ts-ok: conceptual subclass seam using a published Node entrypoint and application metric sink -->

```typescript
import { Semaphore } from "@studnicky/concurrency/node";

class MeteredSemaphore extends Semaphore {
  protected override onAcquire(permitsBefore: number): void {
    metrics.gauge("semaphore.availableBefore", permitsBefore);
  }

  protected override onRelease(permitsAfter: number): void {
    metrics.gauge("semaphore.availableAfter", permitsAfter);
  }
}

const semaphore = MeteredSemaphore.create({ permits: 4 });
```

The base class documents each extension site. Observer hooks observe committed work; behavioral hooks remain part of the operation's contract.

## 3. Dependency ownership

Composition packages expose the ordering, failure, or aggregation behavior they own. They do not proxy-export dependency functionality. Consumers import dependency-owned values and types from that dependency's canonical public entrypoint.

A caller retains references to configured collaborators when it needs their state or lifecycle API. Concurrency behavior composes directly through its owning primitives: a `Semaphore` bounds execution, an `EventBus` carries publications, a `Scheduler` selects timing, and a `Pipeline` defines execution order. Callers retain those primitives and wire their workflows from direct operations. Composition classes do not add scheduler, cache, retry, signal, timing, or context getters merely to mirror their dependencies.

## 4. Infrastructure-free defaults

Bare primitives never require a logger, metric backend, storage service, transport, or framework. Consumers add application integration through subclass hooks or explicit dependency injection.

<!-- inline-ts-ok: conceptual production extension with an application-owned logger -->

```typescript
import { Retry } from "@studnicky/resilience/retry/node";

class AppRetry extends Retry {
  protected override onGiveUp(
    error: Error,
    attemptNumber: number,
    reason: "aborted" | "exhausted" | "nonRetryable",
  ): void {
    appLogger.error({ attemptNumber, error, reason }, "retry stopped");
  }
}

const retry = AppRetry.create({ maximumRetries: 5 });
```

Stateless utilities are pure-static classes. Stateful primitives are created explicitly and injected; no package exports a mutable stateful singleton.

## Package families

Every published package owns a reusable building block: a data structure, a concurrency or timing primitive, a state-machine or pipeline primitive, an I/O boundary, a matching utility, or tooling that verifies those contracts. Product workflows and fixed policy assemblies remain in consumer code as direct compositions of those owners. The [Packages Index](/packages/) is the current source of truth for the public package list.

<Mermaid
  alt="Package family ownership diagram"
  dark-src="/diagrams/architecture-package-families.dark.svg"
  light-src="/diagrams/architecture-package-families.light.svg"
/>

Text equivalent: consumer code composes independently owned primitives and keeps its product policy, collaborator selection, and lifecycle decisions in the application. Each public behavior has one canonical owner and public entrypoint.

## FSM overview

A representative stateful lifecycle uses a single transition funnel:

<Mermaid
  alt="Stateful lifecycle state diagram"
  dark-src="/diagrams/architecture-fsm-overview.dark.svg"
  light-src="/diagrams/architecture-fsm-overview.light.svg"
/>

Text equivalent: `create()` starts the primitive in `idle`; operations move it through active and terminal states. A guard rejects illegal edges, and named entry hooks observe committed state changes. The primitive never enters a state rejected by its transition contract.
