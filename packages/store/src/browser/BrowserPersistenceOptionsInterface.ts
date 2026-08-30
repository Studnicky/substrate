import type { BrowserPersistenceOptionsEntity } from '../entities/BrowserPersistenceOptionsEntity.js';
import type { StateCodecInterface } from '../interfaces/StateCodecInterface.js';
import type { BrowserStorageInterface } from './BrowserStorageInterface.js';

export interface BrowserPersistenceOptionsInterface<TState> extends BrowserPersistenceOptionsEntity.Type {
  readonly 'codec': StateCodecInterface<TState>;
  readonly 'storage'?: BrowserStorageInterface;
}
