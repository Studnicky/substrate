---
title: Package Registry
description: Current classification and platform-parity status for every Substrate package.
---

# Package Registry

This registry is the current public-contract inventory. `Browser status` describes declared
package entrypoints, not an assumption about whether a module can run in a browser bundle. A
portable contract suite is required before an adapter is considered parity-complete.

| Package | Classification | Primary public surface | Browser status | Contract suite |
|---|---|---|---|---|
| batch | primitive | Root and entities | No browser entrypoint declared | Unit suite; parity pending |
| boundary-kit | kit | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| bounded-dispatcher | kit | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| cache | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| circular-buffer | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| clock | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| concurrency | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| config | utility | Root and entities | No browser entrypoint declared | Unit suite; parity pending |
| context | server runtime | Root and interfaces | No browser equivalent planned | Unit suite; not applicable |
| drilldown | utility | Root | No browser entrypoint declared | Unit suite; parity pending |
| entity-store | state collection | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| errors | foundation | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| eslint-config | tooling | Root | Not a runtime package | Unit suite; not applicable |
| event-bus | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| fetch | runtime adapter | Root, entities, interfaces, browser, Node | Browser entrypoint declared and bundle-verified | Shared client contract and browser suite pass |
| file-lock | runtime adapter | Root, entities, interfaces, browser, Node | Web Locks entrypoint declared and bundle-verified | Shared lock contract and browser suite pass |
| filters | utility | Root | No browser entrypoint declared | Unit suite; parity pending |
| flag-evaluator | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| fsm | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| health-registry | server runtime | Root and interfaces | No browser equivalent planned | Unit suite; not applicable |
| idempotency-guard | kit | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| intake-kit | kit | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| json | foundation | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| keyed-rate-limiter | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| keyed-work-gate | kit | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| logger | runtime adapter | Root, entities, interfaces | Portable root API uses the native browser console and is bundle-verified | Transport suite and browser bundle gate pass |
| matching | utility | Root | No browser entrypoint declared | Unit suite; parity pending |
| matching-filters | utility | Root | No browser entrypoint declared | Unit suite; parity pending |
| memoize | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| mutex | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| paginator | state primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| pipeline | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| process-kit | kit | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| request-executor | kit | Root, entities, interfaces | Portable public dependency boundary and browser example | Unit suite and browser bundle gate pass |
| resilience | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| retry | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| sample-buffer | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| scheduler | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| semantic-matching | utility | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| signal | primitive | Root | No browser entrypoint declared | Unit suite; parity pending |
| sliding-window-limiter | primitive | Root, entities, interfaces | No browser entrypoint declared | Unit suite; parity pending |
| store | state | Root, interfaces, browser | Browser persistence entrypoint declared and bundle-verified | Memory, local storage, session storage, and IndexedDB contract suite pass |
| strata-store-kit | kit | Root | Portable layered Store composition | Unit suite verifies propagation, hydration, clear, subscription, and disposal |
| system | runtime adapter | Root, entities, interfaces, browser, Node | Browser runtime facts entrypoint declared and bundle-verified | Shared system contract and browser suite pass |
| throttle | primitive | Root, entities, interfaces | Portable root API | Unit suite passes |
| timing | runtime adapter | Root, entities, interfaces, browser, Node | Browser performance timing entrypoint declared and bundle-verified | Shared timing contract and browser suite pass |
| topic-router | primitive | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| topic-router-models | utility | Root and interfaces | No browser entrypoint declared | Unit suite; parity pending |
| types | foundation | Root | No browser entrypoint declared | Unit suite; parity pending |
| virtual-fs | runtime adapter | Root, entities, interfaces, browser, Node | OPFS entrypoint declared and bundle-verified | Shared async filesystem contract and browser suite pass |
| visible-range | utility | Root, entities, interfaces | Portable root API | Unit suite passes |
| worker-pool | runtime adapter | Root, entities, interfaces, lease, browser, Node | Web Worker pool entrypoint declared and bundle-verified | Shared worker-pool contract suite passes |

## Registry rules

- A package moves from `parity pending` only after every declared platform implementation passes
  the same public contract suite.
- A browser entrypoint is separate from the root only when the runtime implementation differs.
- A server-runtime package states that boundary directly rather than shipping a behaviorally
  misleading browser substitute.
- A new runtime adapter must add its interface, public entrypoint, contract suite, and runnable
  documentation example together.
