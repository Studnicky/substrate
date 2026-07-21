import type { EntryEntity } from '../entities/EntryEntity.js';

export interface StatResultInterface {
  isDirectory(): boolean;
  isFile(): boolean;
  readonly 'mtimeMs': EntryEntity.Type['mtimeMs'];
}
