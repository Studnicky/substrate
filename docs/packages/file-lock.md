---
title: '@studnicky/file-lock'
description: Process-level advisory file locking for CLI tools and daemons.
---

# @studnicky/file-lock

> Acquire exclusive access to a file with rename-based advisory locking and automatic release.

## Install

```bash
pnpm add @studnicky/file-lock
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Acquire a lock, read and write the file while holding it, then release in a `try/finally` block:

<<< ../../packages/file-lock/examples/acquireRelease.ts#usage

### With `using` (explicit resource management)

`FileLock` implements `Symbol.dispose`, so it can be released automatically at block exit. Call `lock[Symbol.dispose]()` directly or use the `using` keyword with TypeScript's explicit resource management:

<<< ../../packages/file-lock/examples/usingDispose.ts#usage

### Custom poll interval and timeout

<!-- inline-ts-ok: two-line options-only snippet; no dedicated example isolates acquire options without contention context -->
```typescript
const lock = await FileLock.create({
  path: '/var/data/queue.json',
  pollMs: 100,     // how often to retry when file is locked (default 50 ms)
  timeoutMs: 3000, // give up after 3 s (default 5000 ms)
});
```

### Builder API

<<< ../../packages/file-lock/examples/builderAcquire.ts#usage

### Error handling

`FileLock.create` throws `FileLockTimeoutError` when the lock cannot be acquired within `timeoutMs`:

<<< ../../packages/file-lock/examples/timeoutContention.ts#usage

## Observability hooks

`FileLock` exposes protected lifecycle hooks at every stage of acquisition, contention, and release. Subclass `FileLock` and override any hook to add logging, metrics, or tracing without touching the core acquire/release logic.

| Hook | When it fires | Args |
|------|---------------|------|
| `onAcquireStart(path)` | Once, before the first rename attempt | `path: string` — the file being locked |
| `onAcquireWait(path, attempt)` | Before each poll sleep when the lock is not yet available | `path: string`, `attempt: number` — 1-based wait count |
| `onContended(path)` | Every time a rename attempt fails because another holder has the file | `path: string` |
| `onAcquire(path)` | Once, when the rename succeeds and the lock is held | `path: string` |
| `onRelease(path)` | Once, after the file is renamed back to its original path | `path: string` |
| `onStaleDetected(path)` | When a stale lock file from a dead process is detected | `path: string` — not fired by the base class; implement in a subclass that adds stale-lock recovery |
| `onStaleBreak(path)` | After a stale lock file has been broken | `path: string` — not fired by the base class |
| `onTimeout(path)` | Once, when the acquisition deadline elapses | `path: string` |
| `onError(path, error)` | When a filesystem error other than contention is caught during acquisition | `path: string`, `error: Error` |

<<< ../../packages/file-lock/examples/observedFileLock.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

A hook override that throws or rejects does not abort acquisition or release — the failure is recorded instead of propagating; inspect it via `hookErrorCount` (a running total) and `getHookErrors()` (a defensive copy of every recorded `{ hookName, cause }` entry), backed internally by `@studnicky/errors`'s `HookInvoker`.

## Try it in the browser

By default, `FileLock` performs all filesystem operations through the real Node.js `fs` module (atomic rename on disk). These demos inject an in-memory `@studnicky/virtual-fs` `VirtualFileSystem` so the exact same lock semantics — atomic rename-based acquisition, contention polling, release — run entirely in the browser.

### Builder with injected VirtualFileSystem

<RunnableExample src="packages/file-lock/examples/vfsLock" title="FileLock with VirtualFileSystem — browser-safe lock" />

### Lifecycle hooks with contention

Two `FileLock` instances share the same `VirtualFileSystem` path. The holder acquires first; the waiter sees `onContended` and `onAcquireWait` events until the holder releases, then acquires and fires `onAcquire`.

<RunnableExample src="packages/file-lock/examples/observedVfsLock" title="Observed FileLock with VirtualFileSystem — contention trace" />

## How it works

`FileLock.create` uses `renameSync` to atomically move the target file to a PID-scoped lock path (`<path>.lock.<pid>`). Any process that cannot rename the file retries at `pollMs` intervals until `timeoutMs` elapses. On release, the file is renamed back to the original path. The mechanism is advisory: all participants must use `FileLock` for mutual exclusion to hold.

## API

| Export | Type | Description |
|--------|------|-------------|
| `FileLock` | class | Advisory file lock; acquired via `FileLock.create` or `FileLock.builder()` |
| `FileLockBuilder` | class | Fluent builder for `FileLock`; returned by `FileLock.builder()` |
| `FileLockTimeoutError` | class | Thrown when lock cannot be acquired within `timeoutMs` |
| `FileLockOptionsEntity` | namespace | Schema and type for `FileLock` options |

### `FileLock`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static (options) => Promise<FileLock>` | Acquires the lock; throws `FileLockTimeoutError` on timeout or `FileLockConfigError` on invalid options |
| `builder` | `static () => FileLockBuilder` | Returns a fluent builder for configuring and acquiring a lock |
| `acquire` | `static (path, options?) => Promise<FileLock>` | Alias for `create({ path, ...options })`; retained for compatibility |
| `read` | `() => string` | Reads the locked file as UTF-8 |
| `write` | `(content: string) => void` | Writes content to the locked file |
| `release` | `() => void` | Releases the lock; safe to call multiple times |
| `[Symbol.dispose]` | `() => void` | Calls `release`; enables `using` syntax |
| `hookErrorCount` | `get hookErrorCount(): number` | Count of hook failures recorded since construction |
| `getHookErrors` | `() => readonly { hookName: string; cause: unknown }[]` | Defensive copy of every hook failure recorded since construction |

### `FileLockBuilder`

| Member | Signature | Description |
|--------|-----------|-------------|
| `withPath` | `(value: string) => this` | Sets the file path to lock |
| `withPollMs` | `(value: number) => this` | Sets the poll interval in milliseconds |
| `withTimeoutMs` | `(value: number) => this` | Sets the acquisition timeout in milliseconds |
| `build` | `() => Promise<FileLock>` | Acquires and returns the lock |

### `FileLockTimeoutError`

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | Path that could not be locked |
| `timeoutMs` | `number` | Timeout that elapsed |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/file-lock)
