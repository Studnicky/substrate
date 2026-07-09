import type { ClockProviderType } from '@studnicky/clock';

import type { FileSystemInterface } from '../interfaces/FileSystemInterface.js';
import type { StatResultInterface } from '../interfaces/StatResultInterface.js';
import type { VirtualFileSystemOptionsType } from '../types/VirtualFileSystemOptionsType.js';

import { VirtualFileSystemError } from '../errors/VirtualFileSystemError.js';
import { VirtualFileSystemBuilder } from './VirtualFileSystemBuilder.js';

type EntryKindType = 'directory' | 'file';
type EntryType = {
  readonly 'kind': EntryKindType;
  readonly 'mtimeMs': number;
};

const DEFAULT_CLOCK: ClockProviderType = {
  'hrtime': () => { return BigInt(Date.now()) * 1_000_000n; },
  'now': () => {
    const result = Date.now();
    return result;
  }
};

class StatResult implements StatResultInterface {
  readonly mtimeMs: number;
  private readonly kind: EntryKindType;

  constructor(kind: EntryKindType, mtimeMs: number) {
    this.kind = kind;
    this.mtimeMs = mtimeMs;
  }

  isDirectory(): boolean {
    return this.kind === 'directory';
  }

  isFile(): boolean {
    return this.kind === 'file';
  }
}

export class VirtualFileSystem implements FileSystemInterface {
  static builder(): VirtualFileSystemBuilder {
    const result = VirtualFileSystemBuilder.create((options) => {
      return new this(options);
    });
    return result;
  }

  static create(options?: VirtualFileSystemOptionsType): VirtualFileSystem {
    const result = new this(options ?? {});
    return result;
  }

  readonly #clock: ClockProviderType;
  readonly #entries: Map<string, EntryType>;
  readonly #files: Map<string, string>;

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  protected constructor(options: VirtualFileSystemOptionsType) {
    this.#clock = options.clock ?? DEFAULT_CLOCK;
    this.#entries = new Map<string, EntryType>();
    this.#files = new Map<string, string>();

    // Seed root directory
    this.#entries.set('/', { 'kind': 'directory', 'mtimeMs': this.#clock.now() });

    // Seed initial files if provided
    if (options.seed !== undefined) {
      const seeds = options.seed;
      const seedKeys = Array.from(seeds.keys());
      const seedLen = seedKeys.length;
      for (let i = 0; i < seedLen; i += 1) {
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
    return this.#files.has(path) || this.#entries.has(path);
  }

  mkdirSync(path: string, options?: { 'recursive'?: boolean }): void {
    const recursive = options?.recursive === true;
    const existingEntry = this.#entries.get(path);

    if (existingEntry?.kind === 'directory') {
      if (!recursive) {
        throw new VirtualFileSystemError(`EEXIST: directory already exists, mkdir '${path}'`);
      }
      return;
    }

    if (recursive) {
      const segments = path.split('/');
      const filtered: string[] = [];
      const segLen = segments.length;
      for (let i = 0; i < segLen; i += 1) {
        const s = segments[i];
        if (s !== undefined && s.length > 0) {
          filtered.push(s);
        }
      }
      let current = '';
      const filteredLen = filtered.length;
      for (let i = 0; i < filteredLen; i += 1) {
        const seg = filtered[i];
        if (seg !== undefined) {
          current = `${current}/${seg}`;
          if (!this.#entries.has(current)) {
            const entry: EntryType = { 'kind': 'directory', 'mtimeMs': this.#clock.now() };
            this.#entries.set(current, entry);
            this.#invokeHook(() => {
              this.onCreate(current);
            });
          }
        }
      }
    } else {
      const entry: EntryType = { 'kind': 'directory', 'mtimeMs': this.#clock.now() };
      this.#entries.set(path, entry);
      this.#invokeHook(() => {
        this.onCreate(path);
      });
    }
  }

  readdirSync(path: string): string[] {
    const entry = this.#entries.get(path);
    if (entry === undefined) {
      throw new VirtualFileSystemError(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    if (entry.kind !== 'directory') {
      throw new VirtualFileSystemError(`ENOTDIR: not a directory, scandir '${path}'`);
    }

    const prefix = path === '/' ? '/' : `${path}/`;
    const result: string[] = [];

    const entryKeys = Array.from(this.#entries.keys());
    const entryLen = entryKeys.length;
    for (let i = 0; i < entryLen; i += 1) {
      const candidate = entryKeys[i];
      if (candidate !== undefined && candidate !== path && candidate.startsWith(prefix)) {
        const rest = candidate.slice(prefix.length);
        if (rest.length > 0 && !rest.includes('/')) {
          result.push(rest);
        }
      }
    }

    const fileKeys = Array.from(this.#files.keys());
    const fileLen = fileKeys.length;
    for (let i = 0; i < fileLen; i += 1) {
      const candidate = fileKeys[i];
      if (
        candidate !== undefined &&
        !this.#entries.has(candidate) &&
        candidate.startsWith(prefix)
      ) {
        const rest = candidate.slice(prefix.length);
        if (rest.length > 0 && !rest.includes('/')) {
          result.push(rest);
        }
      }
    }

    this.#invokeHook(() => {
      this.onRead(path);
    });
    return result;
  }

  readFileSync(path: string, _encoding: 'utf8'): string {
    const content = this.#files.get(path);
    if (content === undefined) {
      throw new VirtualFileSystemError(`ENOENT: no such file or directory, open '${path}'`);
    }
    this.#invokeHook(() => {
      this.onRead(path);
    });
    return content;
  }

  renameSync(oldPath: string, newPath: string): void {
    const content = this.#files.get(oldPath);
    if (content === undefined) {
      throw new VirtualFileSystemError(`ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`);
    }
    const oldEntry = this.#entries.get(oldPath);
    const mtimeMs = this.#clock.now();

    this.#files.set(newPath, content);
    this.#files.delete(oldPath);

    const kind: EntryKindType = oldEntry !== undefined ? oldEntry.kind : 'file';
    this.#entries.set(newPath, { 'kind': kind, 'mtimeMs': mtimeMs });
    this.#entries.delete(oldPath);

    this.#invokeHook(() => {
      this.onRename(oldPath, newPath);
    });
  }

  statSync(path: string): StatResultInterface {
    const entry = this.#entries.get(path);
    const hasFile = this.#files.has(path);

    if (entry === undefined && !hasFile) {
      throw new VirtualFileSystemError(`ENOENT: no such file or directory, stat '${path}'`);
    }

    const kind: EntryKindType = entry !== undefined ? entry.kind : 'file';
    const mtimeMs: number = entry !== undefined ? entry.mtimeMs : this.#clock.now();

    return new StatResult(kind, mtimeMs);
  }

  unlinkSync(path: string): void {
    if (!this.#files.has(path)) {
      throw new VirtualFileSystemError(`ENOENT: no such file or directory, unlink '${path}'`);
    }
    this.#files.delete(path);
    this.#entries.delete(path);
    this.#invokeHook(() => {
      this.onDelete(path);
    });
  }

  writeFileSync(path: string, data: string, _encoding: 'utf8'): void {
    const isNew = !this.#files.has(path);
    const mtimeMs = this.#clock.now();

    this.#files.set(path, data);
    this.#entries.set(path, { 'kind': 'file', 'mtimeMs': mtimeMs });

    if (isNew) {
      this.#invokeHook(() => {
        this.onCreate(path);
      });
    } else {
      this.#invokeHook(() => {
        this.onWrite(path);
      });
    }
  }
}
