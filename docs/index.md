---
layout: home

hero:
  name: Substrate
  text: Subclass-first TypeScript primitives.
  tagline: "A subclass-first toolkit of TypeScript primitives: retry, throttle, mutex, scheduler, clock, context, pipeline, logger, errors, json, and more. Every class is a usable primitive and an extension base."
  image:
    src: /logo.svg
    alt: Substrate
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

---

<PackageGrid />

Substrate is built around three principles that make its primitives safe to subclass and consistent to construct:

**Subclass-first seams.** Public methods delegate to documented protected seams with no-op defaults where observation is needed. Subclass and override only what you need; no base class changes are required.

**No observability in bare classes.** The base class never logs, never emits metrics, never references a logger. Protected hooks are the extension points; observability lives in subclasses or decorators. Observer hooks stay observational; behavioral hooks are documented where they intentionally participate in control flow.

**Factory-owned state.** Stateful classes expose package-root `create(config)` factories so validation and dependency injection follow one construction path. Static helpers remain stateless utility classes.
