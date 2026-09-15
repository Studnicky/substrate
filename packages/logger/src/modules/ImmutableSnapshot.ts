import { Frozen } from '@studnicky/json/node';

export class ImmutableSnapshot {
  public static from<T>(value: T): T {
    const snapshot = structuredClone(value);
    const result = Frozen.deepFreeze(snapshot);
    return result;
  }
}
