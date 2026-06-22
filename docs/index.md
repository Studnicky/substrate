---
layout: home

hero:
  name: Substrate
  text: Subclass-first TypeScript primitives.
  tagline: A subclass-first toolkit of TypeScript primitives — retry, throttle, mutex, scheduler, clock, context, pipeline, logger, errors, json, and more. Every class is a usable primitive and an extension base.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Browse Packages
      link: /packages/
    - theme: alt
      text: GitHub
      link: https://github.com/Studnicky/substrate

features:
  - icon: 🔁
    title: Retry
    details: Generic async retry with extensible error classification, exponential backoff, and interceptors. Override protected hooks to add observability without modifying the base class.
    link: /packages/retry
  - icon: 🚦
    title: Throttle & Batch
    details: Sliding-window concurrency throttle with adaptive limits and detach-and-abandon abort. Batch processes items in controlled parallel groups via async generators.
    link: /packages/throttle
  - icon: 🔒
    title: Mutex
    details: Key-based async mutual exclusion. Operations on different keys run concurrently; operations on the same key are serialized via a queue. Includes timeout and coalesced-operation support.
    link: /packages/mutex
  - icon: ⏱
    title: Scheduler & Clock
    details: Real-time and virtual scheduler primitives for deterministic testing. Clock wraps a swappable provider — swap in VirtualClockProvider to control time in tests.
    link: /packages/scheduler
  - icon: 📦
    title: Async Context
    details: Per-request async context isolation using AsyncLocalStorage. Initialize a scope, execute code within it, and terminate to extract final state — zero global mutable state.
    link: /packages/context
  - icon: ⛓
    title: Pipeline
    details: Generic typed async pipeline for sequential context transforms. Protected hooks fire before and after each stage — no modifications needed to add logging or metrics.
    link: /packages/pipeline
  - icon: 📝
    title: Logger
    details: Pluggable logging interface with ConsoleLogger and Pino wrapper, child loggers, structured LogBody/LogFault builders, and a no-op implementation for testing.
    link: /packages/logger
  - icon: ⚡
    title: Errors
    details: Standardized error hierarchy — BaseError, ModuleError, ValidationError, CliExitError — with cause-chain serialization, error codes, and an ErrorCodeRegistry.
    link: /packages/errors
  - icon: 🔧
    title: JSON Value-Tools
    details: Deep merge, clone, equality, freeze, patch (RFC 6902), hash, path access, sort, and structural hash — all pure-static utility classes with no singletons.
    link: /packages/json
---

Substrate is built around three principles that make every primitive safe to subclass and safe to use as a bare instantiation:

**Subclass-first seams.** Public methods delegate to protected lifecycle hooks with no-op defaults. Subclass and override only what you need — no base class changes required.

**No observability in bare classes.** The base class never logs, never emits metrics, never references a logger. Protected hooks are the extension points; observability lives in subclasses or decorators.

**No exported singletons.** Every stateful class is `new`-able and injectable. Static helpers are pure-static utility classes — no module-level state.
