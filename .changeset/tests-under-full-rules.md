---
"@studnicky/scenario-kit": minor
"@studnicky/eslint-config": minor
---

`@studnicky/scenario-kit` adds the shared test harness that lets specs pass the full source ruleset: `ScenarioSuite.register` and `registerBy` run every case of a validated scenario file through a named runner class, `ScenarioValues` resolves the sentinel values scenario JSON cannot express, and `TestWorkspace` owns a temporary directory with named `TestWorkspaceError` failures. `ScenarioValueError` and `TestWorkspaceError` are `BaseError` subclasses.

`@studnicky/eslint-config` exports `PlatformCallDefaults`, whose `build()` returns the default `platformCalls` list of `@studnicky/no-native-error`, so a configuration extends or filters the defaults instead of restating them.
