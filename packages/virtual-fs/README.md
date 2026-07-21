# @studnicky/virtual-fs

> In-memory synchronous filesystem with an injectable clock and no Node.js runtime dependency.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/virtual-fs)

`VirtualFileSystem` implements a small synchronous filesystem contract for browser-compatible code and deterministic tests. It supports files and directories in memory, seeded content, controlled modification times, and protected lifecycle hooks.

`@studnicky/virtual-fs` is the sole public code entrypoint.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/virtual-fs
```

## Usage

```typescript
import { VirtualFileSystem } from '@studnicky/virtual-fs';

const vfs = VirtualFileSystem.create({
  seed: new Map([['/data/hello.txt', 'Hello, virtual world!']])
});

vfs.mkdirSync('/data', { recursive: true });
vfs.writeFileSync('/data/config.json', '{"version":1}', 'utf8');

const contents = vfs.readFileSync('/data/hello.txt', 'utf8');
const entries = vfs.readdirSync('/data');
const stat = vfs.statSync('/data/config.json');
```

`VirtualFileSystem.create(options)` accepts `VirtualFileSystemOptionsInterface`, including an optional seed map and clock.

## Contracts

```typescript
import type {
  FileSystemInterface,
  StatResultInterface,
  VirtualFileSystemOptionsInterface
} from '@studnicky/virtual-fs';
```

- `EntryEntity.Type` is schema-derived pure filesystem-entry data.
- `MkdirOptionsEntity.Type` is the validated directory-creation options shape used by `FileSystemInterface.mkdirSync()`.
- `VirtualFileSystemOptionsInterface` composes the optional runtime clock and seed map.
- `FileSystemInterface` is the synchronous runtime filesystem contract.
- `StatResultInterface` is the readonly stat contract, including callable `isFile()` and `isDirectory()` members.

## Injectable clock

Pass a `ClockProviderInterface` from `@studnicky/clock` to control `mtimeMs` deterministically:

```typescript
import type { ClockProviderInterface } from '@studnicky/clock';

import { VirtualFileSystem } from '@studnicky/virtual-fs';

const clock: ClockProviderInterface = {
  hrtime: () => 1_000_000_000n,
  now: () => 1000
};

const vfs = VirtualFileSystem.create({ clock });
```

## Observability hooks

Subclass `VirtualFileSystem` to override `onCreate`, `onWrite`, `onRead`, `onRename`, or `onDelete`. These hooks are no-ops by default and do not introduce a logging dependency.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/virtual-fs

## License

MIT
