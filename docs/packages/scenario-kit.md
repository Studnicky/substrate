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

`ScenarioFileCompiler.compileIntake(caseSchema, caseNode)` wraps a caller-supplied case `Schema`/`Node` pair in the shared `{ cases: [...] }` envelope and returns an intake function for it. The returned type is inferred from `caseNode`, never passed as an explicit type argument, so the validated shape and the claimed type cannot drift:

<<< ../../packages/scenario-kit/examples/basic-usage.ts#usage

## Node/Schema agreement

Every entity in this codebase declares both a hand-written `Schema` (the raw JSON Schema, used to compile the validator) and a `SchemaNode`-built `Node` (the typed structure `NodeStaticType` derives `Type` from). `compileIntake` calls `NodeSchemaAgreement` internally before compiling either side, and rejects a `Schema`/`Node` pair that disagree:

<<< ../../packages/scenario-kit/examples/schema-node-drift.ts#usage

This check exists because `Node.schema` cannot be compiled directly: its nested `properties` entries are `{schema: {...}}` wrapper objects the validation engine does not unwrap. A validator compiled straight from `Node.schema` for `{ name: { minLength: 1, type: 'string' } }` accepts both `{ name: 1 }` and `{ name: '' }` — every nested constraint silently passes — and rejects only a top-level `required` violation like `{}`. A `Schema`/`Node` pair proven to agree removes the need to ever compile `Node.schema` on its own.

## Public API

Import `ScenarioFileCompiler` from `@studnicky/scenario-kit/node`. Import `ScenarioFileTypeInterface` — the `{ cases: readonly TCase[] }` envelope shape, parametrized by the caller's own case type — from `@studnicky/scenario-kit/interfaces`.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `ScenarioFileCompiler` | Compiles a `{ cases: [...] }` envelope intake function for a caller-supplied case schema/node pair. | `@studnicky/scenario-kit/node` |
| `ScenarioFileTypeInterface` | Names the `{ cases: readonly TCase[] }` envelope shape. | `@studnicky/scenario-kit/interfaces` |
