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
pnpm run test:all    # node:test across all packages
pnpm run build       # full monorepo build
pnpm run docs:build  # VitePress documentation build
```

## Branching

| Branch type | Naming | Target | Merge strategy |
|---|---|---|---|
| Delivery | `feature/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>` | `develop` | Squash |
| Release | `release/<version>` | `main` | Merge commit |
| Hotfix | `hotfix/<topic>` | `main` | Merge commit |
| Back-merge | `main` | `develop` | Merge commit |

`main` and `develop` are protected. All changes land via pull request. Delivery PRs target `develop`. Release and hotfix PRs target `main`. The canonical back-merge pull request targets `develop` directly from `main`.

The pull-request lifecycle gate rejects incompatible branch and target pairs.

## Commits

Conventional Commits. The first line is the imperative summary; the body explains the why.

```
feat(retry): add jitter option to exponential backoff

Without jitter, concurrent callers retry in lockstep and amplify
load spikes. The new `jitter` option randomises the delay within
the computed window.
```

## Changesets and releases

Delivery PRs add a non-empty valid changeset. The pull-request lifecycle gate requires it for ordinary branches targeting `develop`.

```bash
pnpm changeset
```

This prompts for the affected package(s) (all `@studnicky/*` packages version together as one fixed group, so selecting any one bumps them all), a bump type, and a summary. It writes a `.changeset/<random-name>.md` file — commit it with your PR.

Release and hotfix PRs targeting `main` contain the final versioned release state: packages are lockstep and no pending Changesets remain. The lifecycle gate validates that state through the shared release contract. The release workflow tags the merge commit and publishes it to GitHub Packages. Don't hand-edit a package's `CHANGELOG.md`; `changeset:version` owns each generated release section.

After a release or hotfix merge, the sync workflow opens a `main`-to-`develop` pull request. It merges that pull request with a merge commit so `main` remains an ancestor of `develop`.

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
