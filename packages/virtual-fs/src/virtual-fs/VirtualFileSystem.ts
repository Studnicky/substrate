import type { ClockProviderInterface } from '@studnicky/clock';

import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { EntryEntity } from '../entities/EntryEntity.js';
import type { MkdirOptionsEntity } from '../entities/MkdirOptionsEntity.js';
import type { FileSystemInterface } from '../interfaces/FileSystemInterface.js';
import type { StatResultInterface } from '../interfaces/StatResultInterface.js';
import type { VirtualFileSystemOptionsInterface } from '../interfaces/VirtualFileSystemOptionsInterface.js';

import { VirtualFileSystemError } from '../errors/VirtualFileSystemError.js';

interface VirtualFileSystemConstructorInterface<
  TInstance extends VirtualFileSystem
> extends Function {
  readonly 'prototype': TInstance;
}

const DEFAULT_CLOCK: ClockProviderInterface = {
  'hrtime': () => {
    const result = BigInt(Date.now()) * 1_000_000n;
    return result;
  },
  'now': Date.now
};

class StatResult implements StatResultInterface {
  readonly mtimeMs: EntryEntity.Type['mtimeMs'];
  private readonly shape: EntryEntity.Type['shape'];

  constructor(
    shape: EntryEntity.Type['shape'],
    mtimeMs: EntryEntity.Type['mtimeMs']
  ) {
    this.shape = shape;
    this.mtimeMs = mtimeMs;
  }

  isDirectory(): boolean {
    const result = this.shape === 'directory';
    return result;
  }

  isFile(): boolean {
    const result = this.shape === 'file';
    return result;
  }
}

export class VirtualFileSystem implements FileSystemInterface {
  private static isConstructed<TInstance extends VirtualFileSystem>(
    value: object,
    constructor: VirtualFileSystemConstructorInterface<TInstance>
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }

  static create<TInstance extends VirtualFileSystem = VirtualFileSystem>(
    this: VirtualFileSystemConstructorInterface<TInstance>,
    options?: VirtualFileSystemOptionsInterface
  ): TInstance {
    const constructed: unknown = Reflect.construct(this, [options ?? {}]);
    if (!Predicates.isObjectLike(constructed)) {
      throw RuntimeError.create(
        'VirtualFileSystem.create() must construct a VirtualFileSystem instance'
      );
    }
    if (!VirtualFileSystem.isConstructed(constructed, this)) {
      throw RuntimeError.create(
        'VirtualFileSystem.create() must construct a VirtualFileSystem instance'
      );
    }
    return constructed;
  }

  static #splitPath(path: string): { 'name': string; 'parent': string } {
    const separatorIndex = path.lastIndexOf('/');
    const name = path.slice(separatorIndex + 1);
    const parent = separatorIndex === 0 ? '/' : path.slice(0, separatorIndex);
    const result: { 'name': string; 'parent': string } = {
      'name': name,
      'parent': parent
    };
    return result;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();

  readonly #children: Map<string, Set<string>>;
  readonly #clock: ClockProviderInterface;
  readonly #entries: Map<string, EntryEntity.Type>;
  readonly #files: Map<string, string>;

  #indexAdd(path: string): void {
    const { name, parent } = VirtualFileSystem.#splitPath(path);
    let siblings = this.#children.get(parent);
    if (siblings === undefined) {
      siblings = new Set<string>();
      this.#children.set(parent, siblings);
    }
    siblings.add(name);
  }

  #indexRemove(path: string): void {
    const { name, parent } = VirtualFileSystem.#splitPath(path);
    const siblings = this.#children.get(parent);
    if (siblings !== undefined) {
      siblings.delete(name);
    }
  }

  #invokeCreateHook(path: string): void {
    this.hooks.invoke('onCreate', () => {
      const result = this.onCreate(path);
      return result;
    });
  }

  protected constructor(options: VirtualFileSystemOptionsInterface) {
    this.#children = new Map<string, Set<string>>();
    this.#clock = options.clock ?? DEFAULT_CLOCK;
    this.#entries = new Map<string, EntryEntity.Type>();
    this.#files = new Map<string, string>();

    // Seed root directory
    this.#entries.set('/', { 'mtimeMs': this.#clock.now(), 'shape': 'directory' });

    // Seed initial files if provided
    if (options.seed !== undefined) {
      const seeds = options.seed;
      const seedKeys = Array.from(seeds.keys());
      const seedKeysLength = seedKeys.length;
      for (let i = 0; i < seedKeysLength; i += 1) {
        const path = seedKeys[i];
        if (path !== undefined) {
          const content = seeds.get(path);
          if (content !== undefined) {
            this.writeFileSync(path, content, 'utf8');
          }
        }
      }
    }
  }

  protected onCreate(_path: string): void {}
  protected onDelete(_path: string): void {}
  protected onRead(_path: string): void {}
  protected onRename(_oldPath: string, _newPath: string): void {}
  protected onWrite(_path: string): void {}

  existsSync(path: string): boolean {
    const result = this.#files.has(path) || this.#entries.has(path);
    return result;
  }

  mkdirSync(path: string, options?: MkdirOptionsEntity.Type): void {
    const recursive = options?.recursive === true;
    const existingEntry = this.#entries.get(path);

    if (existingEntry?.shape === 'directory') {
      if (!recursive) {
        throw new VirtualFileSystemError(
          `EEXIST: directory already exists, mkdir '${path}'`
        );
      }
      return;
    }

    if (this.#files.has(path)) {
      throw new VirtualFileSystemError(
        `EEXIST: file already exists, mkdir '${path}'`
      );
    }

    if (recursive) {
      const segments = path.split('/');
      const filtered: string[] = [];
      const segmentsLength = segments.length;
      for (let i = 0; i < segmentsLength; i += 1) {
        const s = segments[i];
        if (s !== undefined && s.length > 0) {
          filtered.push(s);
        }
      }
      let current = '';
      const filteredLength = filtered.length;
      for (let i = 0; i < filteredLength; i += 1) {
        const seg = filtered[i];
        if (seg !== undefined) {
          current = `${current}/${seg}`;
          if (this.#files.has(current)) {
            throw new VirtualFileSystemError(
              `ENOTDIR: not a directory, mkdir '${path}'`
            );
          }
          if (!this.#entries.has(current)) {
            const entry: EntryEntity.Type = {
              'mtimeMs': this.#clock.now(),
              'shape': 'directory'
            };
            this.#entries.set(current, entry);
            this.#indexAdd(current);
            this.#invokeCreateHook(current);
          }
        }
      }
    } else {
      const entry: EntryEntity.Type = {
        'mtimeMs': this.#clock.now(),
        'shape': 'directory'
      };
      this.#entries.set(path, entry);
      this.#indexAdd(path);
      this.hooks.invoke('onCreate', () => {
        const result = this.onCreate(path);
        return result;
      });
    }
  }

  readdirSync(path: string): string[] {
    const entry = this.#entries.get(path);
    if (entry === undefined) {
      throw new VirtualFileSystemError(
        `ENOENT: no such file or directory, scandir '${path}'`
      );
    }
    if (entry.shape !== 'directory') {
      throw new VirtualFileSystemError(
        `ENOTDIR: not a directory, scandir '${path}'`
      );
    }

    const siblings = this.#children.get(path);
    const result: string[] = siblings === undefined ? [] : Array.from(siblings);

    this.hooks.invoke('onRead', () => {
      const hookResult = this.onRead(path);
      return hookResult;
    });
    return result;
  }

  readFileSync(path: string, _encoding: 'utf8'): string {
    const content = this.#files.get(path);
    if (content === undefined) {
      throw new VirtualFileSystemError(
        `ENOENT: no such file or directory, open '${path}'`
      );
    }
    this.hooks.invoke('onRead', () => {
      const result = this.onRead(path);
      return result;
    });
    return content;
  }

  renameSync(oldPath: string, newPath: string): void {
    const content = this.#files.get(oldPath);
    const oldEntry = this.#entries.get(oldPath);

    if (content === undefined && oldEntry === undefined) {
      throw new VirtualFileSystemError(
        `ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`
      );
    }

    const mtimeMs = this.#clock.now();

    if (oldEntry?.shape === 'directory') {
      const prefix = `${oldPath}/`;

      const entryKeys = Array.from(this.#entries.keys());
      const entryKeysLength = entryKeys.length;
      for (let i = 0; i < entryKeysLength; i += 1) {
        const candidate = entryKeys[i];
        if (candidate?.startsWith(prefix) === true) {
          const rest = candidate.slice(prefix.length);
          const entry = this.#entries.get(candidate);
          if (entry !== undefined) {
            const movedPath = `${newPath}/${rest}`;
            this.#entries.set(movedPath, entry);
            this.#entries.delete(candidate);
            this.#indexRemove(candidate);
            this.#indexAdd(movedPath);
            if (entry.shape === 'directory') {
              // The candidate's own child-listing key (it as a parent) is
              // superseded by #indexAdd calls from its descendants below,
              // which derive their new parent purely from movedPath — drop
              // the stale key rather than transplant its (possibly
              // already-drained) Set, which would be iteration-order-dependent.
              this.#children.delete(candidate);
            }
          }
        }
      }

      const fileKeys = Array.from(this.#files.keys());
      const fileKeysLength = fileKeys.length;
      for (let i = 0; i < fileKeysLength; i += 1) {
        const candidate = fileKeys[i];
        if (candidate?.startsWith(prefix) === true) {
          const rest = candidate.slice(prefix.length);
          const fileContent = this.#files.get(candidate);
          if (fileContent !== undefined) {
            this.#files.set(`${newPath}/${rest}`, fileContent);
            this.#files.delete(candidate);
          }
        }
      }

      this.#entries.set(newPath, { 'mtimeMs': mtimeMs, 'shape': 'directory' });
      this.#entries.delete(oldPath);
      this.#indexRemove(oldPath);
      this.#indexAdd(newPath);
      this.#children.delete(oldPath);
    } else {
      if (content !== undefined) {
        this.#files.set(newPath, content);
        this.#files.delete(oldPath);
      }

      const shape: EntryEntity.Type['shape'] =
        oldEntry !== undefined ? oldEntry.shape : 'file';
      this.#entries.set(newPath, { 'mtimeMs': mtimeMs, 'shape': shape });
      this.#entries.delete(oldPath);
      this.#indexRemove(oldPath);
      this.#indexAdd(newPath);
    }

    this.hooks.invoke('onRename', () => {
      const result = this.onRename(oldPath, newPath);
      return result;
    });
  }

  statSync(path: string): StatResultInterface {
    const entry = this.#entries.get(path);
    const hasFile = this.#files.has(path);

    if (entry === undefined && !hasFile) {
      throw new VirtualFileSystemError(
        `ENOENT: no such file or directory, stat '${path}'`
      );
    }

    const shape: EntryEntity.Type['shape'] =
      entry !== undefined ? entry.shape : 'file';
    const mtimeMs: number =
      entry !== undefined ? entry.mtimeMs : this.#clock.now();

    const result = new StatResult(shape, mtimeMs);
    return result;
  }

  unlinkSync(path: string): void {
    if (!this.#files.has(path)) {
      const entry = this.#entries.get(path);
      if (entry?.shape === 'directory') {
        throw new VirtualFileSystemError(
          `EISDIR: illegal operation on a directory, unlink '${path}'`
        );
      }
      throw new VirtualFileSystemError(
        `ENOENT: no such file or directory, unlink '${path}'`
      );
    }
    this.#files.delete(path);
    this.#entries.delete(path);
    this.#indexRemove(path);
    this.hooks.invoke('onDelete', () => {
      const result = this.onDelete(path);
      return result;
    });
  }

  writeFileSync(path: string, data: string, _encoding: 'utf8'): void {
    const isNew = !this.#files.has(path);
    const mtimeMs = this.#clock.now();

    this.#files.set(path, data);
    this.#entries.set(path, { 'mtimeMs': mtimeMs, 'shape': 'file' });

    if (isNew) {
      this.#indexAdd(path);
      this.hooks.invoke('onCreate', () => {
        const result = this.onCreate(path);
        return result;
      });
    } else {
      this.hooks.invoke('onWrite', () => {
        const result = this.onWrite(path);
        return result;
      });
    }
  }
}
