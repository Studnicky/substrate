---
"@studnicky/batch": major
"@studnicky/boundary-kit": major
"@studnicky/bounded-dispatcher": major
"@studnicky/cache": major
"@studnicky/circular-buffer": major
"@studnicky/clock": major
"@studnicky/concurrency": major
"@studnicky/config": major
"@studnicky/context": major
"@studnicky/drilldown": major
"@studnicky/entity": major
"@studnicky/entity-store": major
"@studnicky/errors": major
"@studnicky/eslint-config": major
"@studnicky/event-bus": major
"@studnicky/fetch": major
"@studnicky/file-lock": major
"@studnicky/filters": major
"@studnicky/flag-evaluator": major
"@studnicky/fsm": major
"@studnicky/health-registry": major
"@studnicky/idempotency-guard": major
"@studnicky/json": major
"@studnicky/logger": major
"@studnicky/matching": major
"@studnicky/memoize": major
"@studnicky/mutex": major
"@studnicky/paginator": major
"@studnicky/process-kit": major
"@studnicky/resilience": major
"@studnicky/retry": major
"@studnicky/sample-buffer": major
"@studnicky/scheduler": major
"@studnicky/signal": major
"@studnicky/system": major
"@studnicky/throttle": major
"@studnicky/timing": major
"@studnicky/topic-router": major
"@studnicky/virtual-fs": major
"@studnicky/visible-range": major
"@studnicky/worker-pool": major
---

Every source file reachable from a package's `./browser` export imports its workspace dependencies through their own `/browser` entrypoint rather than `/node`, so a package's browser build no longer pulls in a dependency's Node-only implementation. A package whose `/node` and `/browser` builds previously diverged only by accident of which entrypoint a transitive import happened to resolve to now gets the browser-safe implementation consistently through its whole reachable graph.
