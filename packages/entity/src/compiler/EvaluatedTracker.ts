import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';

/** Creates and merges the evaluated-properties/evaluated-items sets `unevaluated*` reads. */
export class EvaluatedTracker {
  public static create(): EvaluatedTrackerInterface {
    const result = { 'items': new Set<number>(), 'properties': new Set<string>() };
    return result;
  }

  /** Merges `source` into `target` in place; used to fold every composition branch, winning or not. */
  public static mergeInto(target: EvaluatedTrackerInterface, source: EvaluatedTrackerInterface): void {
    source.properties.forEach((key) => {
      target.properties.add(key);
    });
    source.items.forEach((index) => {
      target.items.add(index);
    });
  }
}
