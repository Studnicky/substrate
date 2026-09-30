import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { TestWorkspaceError } from './errors/TestWorkspaceError.js';

/**
 * A temporary directory for a test. Every path argument is relative to the workspace root (an absolute path is used as given). Each platform failure is rethrown as `TestWorkspaceError` with the platform error as `cause`.
 * `using workspace = TestWorkspace.create('prefix-')` removes the directory when the scope ends.
 */
export class TestWorkspace implements Disposable {
  public readonly root: string;

  private constructor(root: string) {
    this.root = root;
  }

  /** Creates a unique directory under the OS temp directory, named with `prefix`. */
  static create(prefix: string): TestWorkspace {
    try {
      const root = mkdtempSync(join(tmpdir(), prefix));
      return new TestWorkspace(root);
    } catch (error) {
      throw TestWorkspace.failure('create', prefix, error);
    }
  }

  /** The absolute path of `relativePath` inside the workspace. */
  resolve(...segments: readonly string[]): string {
    const absolutePath = resolve(this.root, ...segments);
    return absolutePath;
  }

  /** Writes `content` to `relativePath` and returns the absolute path. The parent directory must exist. */
  write(relativePath: string, content: string): string {
    const absolutePath = this.resolve(relativePath);
    try {
      writeFileSync(absolutePath, content, 'utf8');
      return absolutePath;
    } catch (error) {
      throw TestWorkspace.failure('write', absolutePath, error);
    }
  }

  read(relativePath: string): string {
    const absolutePath = this.resolve(relativePath);
    try {
      const content = readFileSync(absolutePath, 'utf8');
      return content;
    } catch (error) {
      throw TestWorkspace.failure('read', absolutePath, error);
    }
  }

  /** Creates `relativePath` and any missing parents; returns the absolute path. */
  mkdir(relativePath: string): string {
    const absolutePath = this.resolve(relativePath);
    try {
      mkdirSync(absolutePath, { 'recursive': true });
      return absolutePath;
    } catch (error) {
      throw TestWorkspace.failure('mkdir', absolutePath, error);
    }
  }

  /** The entry names directly inside `relativePath` (the root by default). */
  list(relativePath = '.'): readonly string[] {
    const absolutePath = this.resolve(relativePath);
    try {
      const names = readdirSync(absolutePath);
      return names;
    } catch (error) {
      throw TestWorkspace.failure('list', absolutePath, error);
    }
  }

  exists(relativePath: string): boolean {
    const present = existsSync(this.resolve(relativePath));
    return present;
  }

  rename(fromPath: string, toPath: string): void {
    const absoluteFrom = this.resolve(fromPath);
    const absoluteTo = this.resolve(toPath);
    try {
      renameSync(absoluteFrom, absoluteTo);
    } catch (error) {
      throw TestWorkspace.failure('rename', `${absoluteFrom} -> ${absoluteTo}`, error);
    }
  }

  /** Removes a file or directory tree; an absent path is not an error. */
  remove(relativePath: string): void {
    const absolutePath = this.resolve(relativePath);
    try {
      rmSync(absolutePath, { 'force': true, 'recursive': true });
    } catch (error) {
      throw TestWorkspace.failure('remove', absolutePath, error);
    }
  }

  /** The canonical absolute path of `relativePath` (the root by default), with symlinks such as macOS `/var` resolved. */
  realpath(relativePath = '.'): string {
    const absolutePath = this.resolve(relativePath);
    try {
      const canonicalPath = realpathSync(absolutePath);
      return canonicalPath;
    } catch (error) {
      throw TestWorkspace.failure('realpath', absolutePath, error);
    }
  }

  /** Removes the whole workspace. */
  dispose(): void {
    this.remove('.');
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  private static failure(operation: string, target: string, cause: unknown): TestWorkspaceError {
    const failure = new TestWorkspaceError(`TestWorkspace ${operation} failed for ${target}: ${String(cause)}`, cause);
    return failure;
  }
}
