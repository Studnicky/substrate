---
title: '@studnicky/virtual-fs'
description: In-memory synchronous filesystem primitive with injectable clock and browser compatibility.
---

# @studnicky/virtual-fs

> In-memory synchronous filesystem primitive. Gives file-lock (and any other fs-dependent code) a browser-compatible backend. Subclass to observe every filesystem event.

## Install

```bash
pnpm add @studnicky/virtual-fs
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

`@studnicky/virtual-fs` is the sole public code entrypoint.

## Usage

Create an instance with `VirtualFileSystem.create(options?)`, seed files, then call the familiar synchronous methods:

<<< ../../packages/virtual-fs/examples/basicVirtualFs.ts#usage

## Try it

### Factory demo

The factory seeds `/data/hello.txt`, writes a second file, renames it, reads the directory listing, and stats the renamed file. All assertions verify the expected state.

<RunnableExample src="packages/virtual-fs/examples/basicVirtualFs" title="VirtualFileSystem factory — seed, write, rename, readdir, stat" />

### Lifecycle hooks

`TracingVfs` subclasses `VirtualFileSystem` and overrides all five hooks: `onCreate`, `onWrite`, `onRead`, `onRename`, and `onDelete`. The demo exercises every path — seeding (triggers `onCreate`), overwriting (triggers `onWrite`), reading, renaming, and unlinking — printing a full hook trace.

<RunnableExample src="packages/virtual-fs/examples/observedVirtualFs" title="Observed VirtualFileSystem — lifecycle hook trace" />

## Observability hooks

Subclass `VirtualFileSystem` and override any protected hook to inject trace logging, metrics, or side-effects at the exact stage where they are needed. Hooks should stay fast and non-blocking; observer-hook failures are contained so the filesystem operation still wins.

| Hook | When it fires | Args |
|------|--------------|------|
| `onCreate(path)` | A new file or directory is created (`writeFileSync` on a new path, `mkdirSync`) | `path: string` |
| `onWrite(path)` | An existing file is overwritten (`writeFileSync` on an existing path) | `path: string` |
| `onRead(path)` | A file or directory is read (`readFileSync`, `readdirSync`) | `path: string` |
| `onRename(oldPath, newPath)` | A file is renamed (`renameSync`) | `oldPath: string`, `newPath: string` |
| `onDelete(path)` | A file is deleted (`unlinkSync`) | `path: string` |

<<< ../../packages/virtual-fs/examples/observedVirtualFs.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Injectable clock

Pass a `@studnicky/clock` `ClockProviderInterface` through `VirtualFileSystem.create({ clock })` to control `mtimeMs` timestamps for deterministic test scenarios:

<!-- inline-ts-ok: conceptual API illustration -->
```typescript
import type { ClockProviderInterface } from '@studnicky/clock';
import { VirtualFileSystem } from '@studnicky/virtual-fs';

// Any ClockProviderInterface drives mtimeMs — here a fixed, deterministic clock.
const clock: ClockProviderInterface = {
  hrtime: () => 1_000_000_000n,
  now: () => 1000
};
const vfs = VirtualFileSystem.create({ clock });
```

## `FileSystemInterface` contract

`VirtualFileSystem` implements `FileSystemInterface`, which is also exported from `@studnicky/virtual-fs`. Any code that depends on filesystem access can accept `FileSystemInterface` and receive either the real Node.js `fs` module adapter or a `VirtualFileSystem` — enabling browser-safe and test-isolated execution of the same logic.

<!-- inline-ts-ok: conceptual API illustration -->
```typescript
import type { FileSystemInterface } from '@studnicky/virtual-fs';

function processFiles(fs: FileSystemInterface): void {
  const entries = fs.readdirSync('/data');
  // works in Node with NodeFileSystem or in the browser with VirtualFileSystem
}
```

## Public API

The package root exports `VirtualFileSystem`, `VirtualFileSystemError`, `EntryEntity`, `VirtualFileSystemOptionsInterface`, `FileSystemInterface`, and `StatResultInterface`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/virtual-fs)
