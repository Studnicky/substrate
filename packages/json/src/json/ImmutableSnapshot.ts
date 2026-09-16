import { ImmutableSnapshotError } from '../errors/ImmutableSnapshotError.js';
import { Frozen } from './Frozen.js';

/** Creates detached, deeply frozen snapshots for values that structured clone supports. */
export class ImmutableSnapshot {
  public static from<T>(value: T): T {
    let detached: T;

    try {
      detached = structuredClone(value);
    } catch (cause) {
      throw new ImmutableSnapshotError(cause);
    }

    const result = Frozen.deepFreeze(detached);
    return result;
  }
}
