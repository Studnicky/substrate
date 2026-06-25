import type { ClockProviderType } from '@studnicky/clock';

import type { VirtualFileSystemOptionsType } from '../types/VirtualFileSystemOptionsType.js';
import type { VirtualFileSystem } from './VirtualFileSystem.js';

export class VirtualFileSystemBuilder {
  static create(factory: (options: VirtualFileSystemOptionsType) => VirtualFileSystem): VirtualFileSystemBuilder {
    return new VirtualFileSystemBuilder(factory);
  }

  readonly #factory: (options: VirtualFileSystemOptionsType) => VirtualFileSystem;
  #clock: ClockProviderType | undefined;
  #seed: Map<string, string> | undefined;

  private constructor(factory: (options: VirtualFileSystemOptionsType) => VirtualFileSystem) {
    this.#factory = factory;
  }

  seed(path: string, content: string): this {
    if (this.#seed === undefined) {
      this.#seed = new Map<string, string>();
    }
    this.#seed.set(path, content);
    return this;
  }

  withClock(clock: ClockProviderType): this {
    this.#clock = clock;
    return this;
  }

  build(): VirtualFileSystem {
    if (this.#clock !== undefined && this.#seed !== undefined) {
      return this.#factory({ 'clock': this.#clock, 'seed': this.#seed });
    }
    if (this.#clock !== undefined) {
      return this.#factory({ 'clock': this.#clock });
    }
    if (this.#seed !== undefined) {
      return this.#factory({ 'seed': this.#seed });
    }
    return this.#factory({});
  }
}
