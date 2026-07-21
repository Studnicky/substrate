---
"@studnicky/process-kit": major
---

### Added

- `ProcessKit` class composing `@studnicky/fsm` (`StateMachine` + `EffectInterpreter`) and `@studnicky/scheduler` into a reducer-with-effects process pattern: `start()`/`dispatch(event)`/`scheduleDispatch(atMs, event)`/`stop()` wire a caller-supplied `StateMachine` subclass to an internally-built `EffectInterpreter` and a scheduler (defaults to `RealTimeScheduler`).
- `ProcessKitConfigInterface` defines the direct runtime composition contract, including the singular optional `handler` configured through `ProcessKit.create({ machine, handler })`.
- Orchestration-boundary guardrails documented inline at the top of `src/ProcessKit.ts` and in `README.md`: no chained `scheduleDispatch` calls against interdependent transitions, no multi-instance registry of named `ProcessKit`s, no checkpoint/resume persistence in `stop()`.
