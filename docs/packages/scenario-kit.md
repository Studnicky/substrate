---
title: '@studnicky/scenario-kit'
description: Shared table-driven test scenario fixture intake — a generic cases[] envelope validated against a caller-supplied case entity.
---

# @studnicky/scenario-kit

> Shared table-driven test scenario fixture intake — a generic `cases[]` envelope validated against a caller-supplied case entity.

## Install

```bash
pnpm add -D @studnicky/scenario-kit
```

## Usage

`ScenarioFileCompiler.compileIntake(entity)` takes a scenario-case entity namespace (`Schema`, `Node`, and `intake`) and returns an intake function for the shared `{ cases: [...] }` envelope. Each case is proven by the entity's own `intake`, and the returned type is inferred from that `intake`, never passed as an explicit type argument, so the validated shape and the claimed type cannot drift. A rejected case throws `ScenarioCaseIntakeError` naming the case position and its `name`; a malformed envelope throws the entity package's `SchemaIntakeError`:

<<< ../../packages/scenario-kit/examples/basic-usage.ts#usage

## Try it

<RunnableExample src="packages/scenario-kit/examples/basic-usage" title="Compile a table-driven scenario intake" />

## Registering a scenario file

`ScenarioSuite.register` compiles a scenario file, opens a `describe`, and registers one `it` per case. Each case runs through the runner named by its `shape`. Runners are the static methods of a class, so the class is the runner map and no spec declares a type alias, a module-scope function, or an object of inline functions. `ScenarioCaseOfType` names the case branch a runner receives:

<!-- inline-ts-ok: usage snippet for a test spec -->
```ts
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { SumScenarioCaseEntity } from './entities/SumScenarioCaseEntity.js';
import scenarioGroups from './Sum.scenarios.json' with { 'type': 'json' };

class SumRunners {
  static 'adds'(scenarioCase: ScenarioCaseOfType<SumScenarioCaseEntity.Type, 'adds'>): void {
    // assertions against scenarioCase.input / scenarioCase.expected
  }

  static async 'adds-later'(scenarioCase: ScenarioCaseOfType<SumScenarioCaseEntity.Type, 'adds-later'>): Promise<void> {
    // a returned promise is awaited before the next case starts
  }
}

ScenarioSuite.register({
  'entity': SumScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Sum',
  'runners': SumRunners
});
```

The compiler reports a missing runner (a shape with no matching static method) as a type error. Options:

| Option | Purpose |
|---|---|
| `entity` | The scenario-case entity namespace; its `intake` proves every case. |
| `file` | The parsed `*.scenarios.json` content. |
| `name` | The `describe` title. |
| `runners` | One runner per discriminant value. A `Promise` return is awaited. |
| `extraTests` | A callback that registers further `it` blocks inside the same `describe`, after the scenario cases. |
| `timeoutMs` | Per-case timeout in milliseconds; omitted means none. |

Cases discriminated by a field other than `shape` register through `ScenarioSuite.registerBy('operation', options)`; the runner class then has one static method per `operation` value and `ScenarioCaseOfType<TCase, 'value', 'operation'>` names each case branch.

## Reading untyped values

`ScenarioValues` holds the typed readers for values taken out of untyped scenario data. Every reader takes `(value, label)` and throws `ScenarioValueError` (code `scenarioKit.valueInvalid`) with the message `<label> must be a <type>` when the value has the wrong type.

| Reader | Returns |
|---|---|
| `requireString` | `string` |
| `requireNumber` | `number` (not `NaN`) |
| `requireFiniteNumber` | `number` (finite) |
| `requireInteger` | `number` (integer) |
| `requireBoolean` | `boolean` |
| `requireRecord` | `Record<string, unknown>` (a plain object, not an array) |
| `requireArray` | `readonly unknown[]` |
| `requireStringArray` | `readonly string[]`, each item named `label[index]` |
| `requireNumberArray` | `readonly number[]`, each item named `label[index]` |
| `requireDefined` | the value narrowed from `T \| undefined` to `T` |
| `requireProperty(record, key, label)` | the value of an own property, rejecting an absent key |

## Temporary directories

`TestWorkspace.create(prefix)` makes a unique directory under the OS temp directory. Every path argument is relative to the workspace root; an absolute path is used as given. Each filesystem operation catches the platform error and rethrows `TestWorkspaceError` (code `scenarioKit.workspaceFailed`) with the platform error as `cause`. `using workspace = TestWorkspace.create('prefix-')` removes the directory when the scope ends:

<!-- inline-ts-ok: usage snippet for a test spec -->
```ts
import { TestWorkspace } from '@studnicky/scenario-kit/node';

using workspace = TestWorkspace.create('file-lock-tests-');
workspace.mkdir('locks');
const lockPath = workspace.write('locks/a.lock', 'owner-1');
workspace.read('locks/a.lock');
workspace.rename('locks/a.lock', 'locks/b.lock');
workspace.exists('locks/b.lock');
workspace.list('locks');
workspace.remove('locks');
```

| Member | Operation |
|---|---|
| `root` | The absolute workspace directory. |
| `resolve(...segments)` | The absolute path of `segments` inside the workspace. |
| `write(path, content)` | Writes UTF-8 text and returns the absolute path; the parent directory must exist. |
| `read(path)` | Reads UTF-8 text. |
| `mkdir(path)` | Creates the directory and missing parents; returns the absolute path. |
| `list(path = '.')` | The entry names directly inside a directory. |
| `exists(path)` | Whether the path exists. |
| `rename(from, to)` | Moves a file or directory. |
| `remove(path)` | Removes a file or directory tree; an absent path is not an error. |
| `realpath(path = '.')` | The canonical path with symlinks resolved. |
| `dispose()` | Removes the whole workspace; `using` calls it at scope end. |

## Node/Schema agreement

Every entity in this codebase declares both a hand-written `Schema` (the raw JSON Schema, used to compile the validator) and a `SchemaNode`-built `Node` (the typed structure `NodeStaticType` derives `Type` from). `compileIntake` calls `NodeSchemaAgreement` internally before compiling the envelope, and rejects an entity whose `Schema` and `Node` disagree:

<<< ../../packages/scenario-kit/examples/schema-node-drift.ts#usage

This check exists because `Node.schema` cannot be compiled directly: its nested `properties` entries are `{schema: {...}}` wrapper objects the validation engine does not unwrap. A validator compiled straight from `Node.schema` for `{ name: { minLength: 1, type: 'string' } }` accepts both `{ name: 1 }` and `{ name: '' }` — every nested constraint silently passes — and rejects only a top-level `required` violation like `{}`. A `Schema`/`Node` pair proven to agree removes the need to ever compile `Node.schema` on its own.

## Public API

Import `ScenarioFileCompiler`, `ScenarioSuite`, `ScenarioValues`, `TestWorkspace`, and the error classes from `@studnicky/scenario-kit/node`. Import the contract interfaces from `@studnicky/scenario-kit/interfaces` and the case-shape types from `@studnicky/scenario-kit/types`.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `ScenarioFileCompiler` | Compiles a `{ cases: [...] }` envelope intake function for a scenario-case entity namespace. | `@studnicky/scenario-kit/node` |
| `ScenarioSuite` | Registers a scenario file with `node:test`, routing each case to the runner its discriminant names. | `@studnicky/scenario-kit/node` |
| `ScenarioValues` | Typed readers that reject a wrongly typed scenario value with `ScenarioValueError`. | `@studnicky/scenario-kit/node` |
| `TestWorkspace` | A disposable temporary directory whose filesystem failures surface as `TestWorkspaceError`. | `@studnicky/scenario-kit/node` |
| `ScenarioCaseIntakeError` | Thrown when a case is rejected by its entity's `intake` (`scenarioKit.caseInvalid`). | `@studnicky/scenario-kit/node` |
| `ScenarioValueError` | Thrown by a `ScenarioValues` reader (`scenarioKit.valueInvalid`). | `@studnicky/scenario-kit/node` |
| `TestWorkspaceError` | Thrown by a `TestWorkspace` operation (`scenarioKit.workspaceFailed`). | `@studnicky/scenario-kit/node` |
| `ScenarioCaseEntityInterface` | Names the `Schema`, `Node`, and `intake` members of a scenario-case entity namespace. | `@studnicky/scenario-kit/interfaces` |
| `ScenarioFileTypeInterface` | Names the `{ cases: readonly TCase[] }` envelope shape. | `@studnicky/scenario-kit/interfaces` |
| `ScenarioSuiteOptionsInterface` | Names the options `ScenarioSuite.register` takes. | `@studnicky/scenario-kit/interfaces` |
| `ScenarioCaseOfType` | The branch of a case union selected by one discriminant value. | `@studnicky/scenario-kit/types` |
| `ScenarioCaseType` | A case with a `name` and a string discriminant under a named key. | `@studnicky/scenario-kit/types` |
| `ScenarioRunnerMapType` | One runner per discriminant value; a class with one static method per shape satisfies it. | `@studnicky/scenario-kit/types` |
