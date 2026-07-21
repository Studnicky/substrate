# Changelog

## 7.0.1

### Patch Changes

- @studnicky/fsm@7.0.1
- @studnicky/scheduler@7.0.1
- @studnicky/signal@7.0.1

## 7.0.0

### Patch Changes

- @studnicky/fsm@7.0.0
- @studnicky/scheduler@7.0.0
- @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `ProcessKit` class composing `@studnicky/fsm` (`StateMachine` + `EffectInterpreter`) and `@studnicky/scheduler` into a reducer-with-effects process pattern: `start()`/`dispatch(event)`/`scheduleDispatch(atMs, event)`/`stop()` wire a caller-supplied `StateMachine` subclass to an internally-built `EffectInterpreter` and a scheduler (defaults to `RealTimeScheduler`).
- `ProcessKitConfigInterface` defines the direct runtime composition contract, including the singular optional `handler` configured through `ProcessKit.create({ machine, handler })`.
- Orchestration-boundary guardrails documented inline at the top of `src/ProcessKit.ts` and in `README.md`: no chained `scheduleDispatch` calls against interdependent transitions, no multi-instance registry of named `ProcessKit`s, no checkpoint/resume persistence in `stop()`.
