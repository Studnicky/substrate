---
layout: home

hero:
  name: Substrate
  text: Composable TypeScript primitives.
  tagline: "Focused contracts and operations for matching, routing, filtering, state, concurrency, time, I/O, and structured errors. Consumers compose the tools into their own applications."
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

Substrate is built around three principles that keep its tools focused, composable, and extensible:

**Focused ownership.** Each package owns one behavior and its contracts. A composition package owns its ordering, failure, or aggregation behavior without proxying dependency APIs or imposing application policy.

**Explicit composition.** Consumers import the primitives and contracts they need, supply their own policies and collaborators, and combine deterministic filters, matching evidence, selection, delivery, state, and infrastructure according to their application.

**Extension seams.** Stateful primitives expose direct factories and operations. Documented protected hooks and injected dependencies allow observability and application-specific behavior without coupling bare primitives to infrastructure.
