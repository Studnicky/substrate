---
title: "@studnicky/virtual-fs"
description: In-memory synchronous filesystem primitive with injectable clock and browser compatibility.
---

# @studnicky/virtual-fs

> In-memory synchronous filesystem primitive. Gives filesystem-dependent code a browser-compatible backend. Subclass to observe every filesystem event.

## Install

```bash
pnpm add @studnicky/virtual-fs
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

`@studnicky/virtual-fs/node` exposes Node filesystem APIs and `@studnicky/virtual-fs/browser` exposes browser APIs.

`@studnicky/virtual-fs/node` exports `VirtualFileSystem`, the synchronous in-memory primitive. For durable async
files, `@studnicky/virtual-fs/node` exposes Node promise-based files and
`@studnicky/virtual-fs/browser` exposes native Origin Private File System storage.

## Usage

Testing a supplier catalogue import shouldn't require touching the real disk — `VirtualFileSystem` gives Northstar's test suite a filesystem that behaves exactly like Node's `fs`, entirely in memory. Create an instance with `VirtualFileSystem.create(options?)`, seed it with starting files, and then call the same synchronous methods you'd already reach for: `writeFileSync`, `readFileSync`, `renameSync`, `readdirSync`, `statSync`. The example below seeds one file, writes a second, reads both back, renames one, lists the directory, and stats the result — all without a single real file touched.

<<< ../../packages/virtual-fs/examples/basicVirtualFs.ts#usage

## Try it

### Factory demo

Run it and watch one `VirtualFileSystem` instance walk through a realistic import: it starts seeded with `/data/hello.txt`, writes `config.json` alongside it, renames that file to `settings.json`, lists everything sitting in `/data`, and stats the renamed file to confirm it's really there. Every step is checked by an assertion, so the demo doubles as proof the in-memory filesystem behaves exactly like the real one would.

<RunnableExample src="packages/virtual-fs/examples/basicVirtualFs" title="VirtualFileSystem factory — seed, write, rename, readdir, stat" />

### Lifecycle hooks

Suppose Northstar wants a full audit trail of every file touched during a book-metadata import, without hard-coding logging calls into the filesystem logic itself. `TracingVfs` subclasses `VirtualFileSystem` and overrides all five lifecycle hooks — `onCreate`, `onWrite`, `onRead`, `onRename`, and `onDelete` — to record each one instead. Run the demo to see every operation in a realistic import walk through its matching hook: a fresh file triggers `onCreate`, overwriting it triggers `onWrite`, and reading, renaming, and deleting each fire their own event in a full trace.

<RunnableExample src="packages/virtual-fs/examples/observedVirtualFs" title="Observed VirtualFileSystem — lifecycle hook trace" />

### Origin Private File System

A bookseller drafting an import list in the browser needs somewhere durable to stash it between page loads — somewhere that isn't a server round-trip and isn't `localStorage`. `OpfsFileSystem` implements the same asynchronous durable-file contract through the browser's native Origin Private File System, so the demo can create a directory, write a file into it, read the directory listing and the file back, and clean up — all running against real OPFS storage in your browser, no server involved.

<RunnableExample src="packages/virtual-fs/examples/browserOpfs" title="OpfsFileSystem — browser-native durable files" />

## Observability hooks

Every meaningful filesystem event — a file created, overwritten, read, renamed, or deleted — has a matching protected hook ready to be overridden, so Northstar can inject trace logging, metrics, or other side-effects at exactly the stage that matters. Keep overrides fast and non-blocking; a hook that throws is contained so the real filesystem operation still succeeds regardless.

| Hook                         | When it fires                                                                   | Args                                 |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| `onCreate(path)`             | A new file or directory is created (`writeFileSync` on a new path, `mkdirSync`) | `path: string`                       |
| `onWrite(path)`              | An existing file is overwritten (`writeFileSync` on an existing path)           | `path: string`                       |
| `onRead(path)`               | A file or directory is read (`readFileSync`, `readdirSync`)                     | `path: string`                       |
| `onRename(oldPath, newPath)` | A file is renamed (`renameSync`)                                                | `oldPath: string`, `newPath: string` |
| `onDelete(path)`             | A file is deleted (`unlinkSync`)                                                | `path: string`                       |

<<< ../../packages/virtual-fs/examples/observedVirtualFs.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Injectable clock

Pass a `@studnicky/clock` `ClockProviderInterface` through `VirtualFileSystem.create({ clock })` to control `mtimeMs` timestamps for deterministic test scenarios:

<!-- inline-ts-ok: conceptual API illustration -->

```typescript
import type { ClockProviderInterface } from "@studnicky/clock/interfaces";
import { VirtualFileSystem } from "@studnicky/virtual-fs/node";

// Any ClockProviderInterface drives mtimeMs — here a fixed, deterministic clock.
const clock: ClockProviderInterface = {
  hrtime: () => 1_000_000_000n,
  now: () => 1000,
};
const vfs = VirtualFileSystem.create({ clock });
```

## `FileSystemInterface` contract

`VirtualFileSystem` implements `FileSystemInterface`, exported from `@studnicky/virtual-fs/interfaces`. Any code that depends on filesystem access can accept `FileSystemInterface` and receive either the real Node.js `fs` module adapter or a `VirtualFileSystem` — enabling browser-safe and test-isolated execution of the same logic.

<!-- inline-ts-ok: conceptual API illustration -->

```typescript
import type { FileSystemInterface } from "@studnicky/virtual-fs/interfaces";

function processFiles(fs: FileSystemInterface): void {
  const entries = fs.readdirSync("/data");
  // works in Node with NodeFileSystem or in the browser with VirtualFileSystem
}
```

## Async files

`AsyncFileSystemInterface` is the shared contract for durable asynchronous files. It supports
existence checks, directory creation and listing, file reads and writes, and recursive removal.
Use `NodeFileSystem` on the server or `OpfsFileSystem` in browsers that provide OPFS.

## Public API

`@studnicky/virtual-fs/node` exports `VirtualFileSystem` and `VirtualFileSystemError`; `FileSystemInterface` is available from `@studnicky/virtual-fs/interfaces`. Filesystem entities use `@studnicky/virtual-fs/entities`; option and stat contracts use `@studnicky/virtual-fs/interfaces`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/virtual-fs)

## Entities

`@studnicky/virtual-fs/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { EntryEntity } from "@studnicky/virtual-fs/entities";
```

## Interfaces

`@studnicky/virtual-fs/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { StatResultInterface } from "@studnicky/virtual-fs/interfaces";
```

## What it is

`@studnicky/virtual-fs` is a filesystem boundary with a synchronous in-memory implementation and runtime-specific durable adapters. It provides files, directories, metadata, and contracts for code that needs filesystem access; it does not provide a document repository, synchronisation product, or durable service policy.

## What it is for

Northstar Books uses this package to test import and export logic without the host filesystem, to run server-side durable file work through Node, or to store browser-side drafts through Origin Private File System. Node and browser are runtime-specific alternatives. Entities validate file data and interfaces let Northstar accept a file-system port without coupling book-processing logic to an adapter.

## Northstar Books examples

- **VirtualFileSystem factory — seed, write, rename, readdir, stat** solves the “test a supplier catalogue-file import without creating real files” problem. It seeds and mutates an in-memory directory, proving that Northstar can exercise familiar filesystem behaviour in an isolated test.
- **Observed VirtualFileSystem — lifecycle hook trace** solves the “record every file operation during a book-metadata import” problem. It traces create, write, read, rename, and delete operations, proving that Northstar can add observation without embedding metrics in filesystem logic.
- **OpfsFileSystem — browser-native durable files** solves the “retain a bookseller’s offline import draft in the browser” problem. It uses the browser-native durable adapter through the public contract, proving that Northstar can select an environment-appropriate backing store.

## Public entrypoints

| Import path                        | Use it when                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `@studnicky/virtual-fs/node`       | Northstar uses an in-memory filesystem or Node durable-file adapter in server and test code. |
| `@studnicky/virtual-fs/browser`    | Northstar uses the browser Origin Private File System adapter for local durable files.       |
| `@studnicky/virtual-fs/entities`   | Northstar validates file-entry data at a filesystem boundary.                                |
| `@studnicky/virtual-fs/interfaces` | Northstar accepts synchronous or asynchronous filesystem capabilities through contracts.     |

## Exports

| Symbol                           | Purpose                                                                                                                                                                       | Import path                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `FileSystemInterface`            | Defines the synchronous in-memory file system contract.                                                                                                                       | `@studnicky/virtual-fs/interfaces` |
| `AsyncFileSystemInterface`       | Defines durable asynchronous file operations.                                                                                                                                 | `@studnicky/virtual-fs/interfaces` |
| `NodeFileSystem`                 | Provides Node promise-based filesystem operations.                                                                                                                            | `@studnicky/virtual-fs/node`       |
| `OpfsFileSystem`                 | Provides native browser Origin Private File System operations.                                                                                                                | `@studnicky/virtual-fs/browser`    |
| `OpfsFileSystemOptionsInterface` | Defines OPFS construction options.                                                                                                                                            | `@studnicky/virtual-fs/browser`    |
| `OpfsStorageInterface`           | Defines the injected OPFS storage boundary.                                                                                                                                   | `@studnicky/virtual-fs/browser`    |
| `VirtualFileSystem`              | Provides virtual file system functionality.                                                                                                                                   | `@studnicky/virtual-fs/node`       |
| `VirtualFileSystemError`         | Represents virtual file system failures. `NodeFileSystem` and `OpfsFileSystem` reject with it, carrying the platform `fs` error or `DOMException` as `cause` and its message. | `@studnicky/virtual-fs/node`       |
