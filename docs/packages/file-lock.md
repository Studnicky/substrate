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

```typescript
import { FileLock } from '@studnicky/file-lock';

// Acquire a lock; blocks until available or timeout
const lock = await FileLock.acquire('/var/run/myapp/state.json');

try {
  const content = lock.read();
  const state = JSON.parse(content);
  state.lastRun = Date.now();
  lock.write(JSON.stringify(state));
} finally {
  lock.release(); // renames lock file back to original path
}
```

### With `using` (explicit resource management)

```typescript
{
  await using lock = await FileLock.acquire('/var/run/myapp/pid');
  lock.write(String(process.pid));
} // lock.release() called automatically on block exit
```

### Custom poll interval and timeout

```typescript
const lock = await FileLock.acquire('/var/data/queue.json', {
  pollMs: 100,     // how often to retry when file is locked (default 50 ms)
  timeoutMs: 3000, // give up after 3 s (default 5000 ms)
});
```

### Error handling

```typescript
import { FileLock, FileLockTimeoutError } from '@studnicky/file-lock';

try {
  const lock = await FileLock.acquire(path, { timeoutMs: 1000 });
  // ...
  lock.release();
} catch (err) {
  if (err instanceof FileLockTimeoutError) {
    console.error(`Timed out after ${err.timeoutMs}ms on ${err.path}`);
  }
}
```

## How it works

`FileLock.acquire` uses `renameSync` to atomically move the target file to a PID-scoped lock path (`<path>.lock.<pid>`). Any process that cannot rename the file retries at `pollMs` intervals until `timeoutMs` elapses. On release, the file is renamed back to the original path. The mechanism is advisory — all participants must use `FileLock` for mutual exclusion to hold.

## API

| Export | Type | Description |
|--------|------|-------------|
| `FileLock` | class | Advisory file lock; acquired via `FileLock.acquire` |
| `FileLockTimeoutError` | class | Thrown when lock cannot be acquired within `timeoutMs` |
| `FileLockOptionsType` | type | `{ pollMs?, timeoutMs? }` |

### `FileLock`

| Member | Signature | Description |
|--------|-----------|-------------|
| `acquire` | `static (path, options?) => Promise<FileLock>` | Acquires the lock; throws `FileLockTimeoutError` on timeout |
| `read` | `() => string` | Reads the locked file as UTF-8 |
| `write` | `(content: string) => void` | Writes content to the locked file |
| `release` | `() => void` | Releases the lock; safe to call multiple times |
| `[Symbol.dispose]` | `() => void` | Calls `release`; enables `using` syntax |

### `FileLockTimeoutError`

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | Path that could not be locked |
| `timeoutMs` | `number` | Timeout that elapsed |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/file-lock)
