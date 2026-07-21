# @studnicky/file-lock

> Acquire exclusive access to a file with rename-based advisory locking and automatic release.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/file-lock)

`@studnicky/file-lock` provides exclusive file access through atomic `renameSync`-based locking. Acquiring a lock moves the target file to a per-process lock path; releasing it moves the file back. Because the acquire step is a single filesystem rename, only one caller can hold the lock at a time — no lock files to clean up, no stale state.

The file must exist at the given path before calling `create`. If the file is absent or already locked by another process, `create` throws `FileLockTimeoutError` after the configured timeout. The `FileLock` instance exposes `read` and `write` for operating on the locked file, and `release` (or `Symbol.dispose`) to return it to its original path.

Serializable configuration and retained path state are canonicalized by `FileLockOptionsEntity` and `FileLockPathStateEntity`, both exported from the package root with runtime validators. `FileLockCreateOptionsInterface` adds only the live filesystem and owner-token contracts while indexing its data fields from `FileLockOptionsEntity.Type`.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/file-lock
```

## Usage

### Acquire, read, write, release

```typescript
import { FileLock } from '@studnicky/file-lock';

const lock = await FileLock.create({ path: '/data/config.json' });

try {
  const content = lock.read();
  const config = JSON.parse(content);
  config.updatedAt = new Date().toISOString();
  lock.write(JSON.stringify(config, null, 2));
} finally {
  lock.release();
}
```

### Automatic release with `await using`

```typescript
import { FileLock } from '@studnicky/file-lock';

{
  await using lock = await FileLock.create({ path: '/data/config.json' });
  lock.write('new content');
} // lock.release() called automatically on block exit
```

### Custom poll and timeout

```typescript
import { FileLock } from '@studnicky/file-lock';

const lock = await FileLock.create({
  path: '/data/config.json',
  pollMs: 50,      // check every 50 ms (default: 50)
  timeoutMs: 5000, // give up after 5 s (default: 5000)
});

try {
  lock.write('updated');
} finally {
  lock.release();
}
```

### Handling lock contention

```typescript
import { FileLock, FileLockTimeoutError } from '@studnicky/file-lock';

try {
  const lock = await FileLock.create({ path: '/data/config.json', timeoutMs: 2000 });
  try {
    lock.write('updated');
  } finally {
    lock.release();
  }
} catch (err) {
  if (err instanceof FileLockTimeoutError) {
    console.error(`Could not acquire lock on ${err.path} within ${err.timeoutMs} ms`);
  } else {
    throw err;
  }
}
```

## Hook failures

A hook override that throws or rejects does not abort acquisition or release — the failure is recorded instead of propagating, backed internally by `@studnicky/errors`'s `HookInvoker`. Inspect the count via `hookErrorCount`; `getHookErrors()` returns detached errors and nested causes:

```typescript
class FaultyLock extends FileLock {
  protected override onAcquire(): void {
    throw new Error('boom');
  }
}

const lock = await FaultyLock.create({ path: '/tmp/queue.json' });
lock.hookErrorCount; // 1
```

## License

MIT
