import type { StatePersistenceInterface } from '../../src/interfaces/index.js';

import { MemoryPersistence } from '../../src/MemoryPersistence.js';

/** Number persistence over a memory backing store whose first save is held open until released, recording every completed write. */
export class RecordingGatedPersistence implements StatePersistenceInterface<number> {
  public readonly backing = MemoryPersistence.create<number>();
  public readonly firstSaveStarted = Promise.withResolvers<void>();
  public readonly releaseFirstSave = Promise.withResolvers<void>();
  public readonly writes: number[] = [];
  public saveCalls = 0;

  public async clear(key: string): Promise<void> {
    await this.backing.clear(key);
  }

  public async load(key: string): Promise<number | undefined> {
    const loaded = await this.backing.load(key);
    return loaded;
  }

  public async save(key: string, state: number): Promise<void> {
    this.saveCalls += 1;
    if (this.saveCalls === 1) {
      this.firstSaveStarted.resolve();
      await this.releaseFirstSave.promise;
    }
    this.writes.push(state);
    await this.backing.save(key, state);
  }
}
