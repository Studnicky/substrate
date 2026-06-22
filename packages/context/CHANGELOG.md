# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Context` class providing per-request async isolation via `AsyncLocalStorage`, with `get`/`set`/`tryGet`/`delete`/`has`/`keys`/`snapshot` store operations and `isActive()` guard.
- `ContextScope` FSM (`created → active → terminated`) returned from `Context.initialize()`, with `execute()` for store-bound execution and `terminate()` to extract final state.
- Protected extension hooks: `Context.onInitialize` for seeding default values at scope construction, `Context.onMissingContext` for lenient-mode suppression, and `ContextScope.onEnter`/`onBeforeExecute`/`onAfterExecute`/`onTerminate` for FSM observability.
- `ContextBuilder` fluent API (`Context.builder().name('...').build()`) for declarative construction with an overridable `validateBuild` hook.
