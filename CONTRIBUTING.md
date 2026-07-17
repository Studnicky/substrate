# Contributing

## Prerequisites

- Node 24 or later (`node --version`)
- pnpm 10 or later (`pnpm --version`); the repo pins `pnpm@10.32.1` via `packageManager`

## Setup

```bash
git clone https://github.com/Studnicky/substrate.git
cd substrate
pnpm install
```

## Local checks

All of these must pass before opening a PR:

```bash
pnpm run typecheck   # tsc -b (composite project)
pnpm run lint        # ESLint across all packages
pnpm test            # node:test across all packages
pnpm run build       # full monorepo build
pnpm run docs:build  # VitePress documentation build
```

## Branching

| Branch type | Naming | Target |
|---|---|---|
| Feature | `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>` | `develop` |
| Release | `release/<version>` | `main` |
| Hotfix | `hotfix/<topic>` | `main` |

`main` and `develop` are protected. All changes land via pull request. Feature PRs target `develop`. Release and hotfix PRs target `main`.

Squash-merge features into `develop`. Release branches back-merge into `develop` after the `main` merge.

## Commits

Conventional Commits. The first line is the imperative summary; the body explains the why.

```
feat(retry): add jitter option to exponential backoff

Without jitter, concurrent callers retry in lockstep and amplify
load spikes. The new `jitter` option randomises the delay within
the computed window.
```

## Changesets (mandatory)

Every PR must include a changeset. The `changelog-check` workflow enforces this on PRs targeting `main`.

```bash
pnpm changeset
```

This prompts for the affected package(s) (all `@studnicky/*` packages version together as one fixed group, so selecting any one bumps them all), a bump type, and a summary. It writes a `.changeset/<random-name>.md` file — commit it with your PR.

At release time, `pnpm changeset:version` consumes every pending changeset: it bumps `package.json#version` in lockstep across all packages and prepends the summaries to each affected package's own `CHANGELOG.md`. Don't hand-edit a package's `CHANGELOG.md` — the next `changeset:version` run overwrites hand-written entries at the same heading. Release and hotfix branches run `changeset:version` and commit the result before tagging; the publish workflow's changeset gate fails the release if any `.changeset/*.md` file is left unconsumed.

## Design rules

Substrate has three non-negotiable design rules that every new class and API change must respect.

**Subclass-first seams.** Every public method delegates to `protected` lifecycle hooks with no-op defaults. Consumers extend the class and override those hooks to alter behavior. No plugin registries, no option-bag escape hatches that duplicate what subclassing already provides.

**No observability in bare classes.** The base class never calls a logger, never emits a metric, never references an external service. Telemetry hooks are `protected` no-ops (e.g. retry's `onAttempt`, `onSuccess`, `onGiveUp`). Consumers override them in their application-boundary subclass where the logger reference lives.

**No exported singletons.** Stateful classes are `new`-able and injectable, exposed via a static `create()` factory. Pure utilities are static-method-only classes with no module-level mutable state. Stateful classes channel all state changes through a single `transition()` funnel that subclasses can intercept via `guard()` and `onEnter()` hooks.

See [Architecture](https://studnicky.github.io/substrate/architecture) for the rationale and examples.

## Docs

The documentation site lives under `docs/`. To preview locally:

```bash
pnpm run docs:dev
```

Doc pages use present tense, no em-dashes, no emoji.
