/**
 * @module @studnicky/errors
 * @description Records a lifecycle-hook event and logs a trace line in one call —
 * example/demo glue for `onX` hook overrides that both capture and print an event.
 */

export class EventRecorder<T> {
  readonly #events: T[] = [];

  get events(): readonly T[] {
    const result: T[] = [];
    for (const event of this.#events) {
      result.push(structuredClone(event));
    }
    return result;
  }

  record(event: T, message: string): void {
    this.#events.push(structuredClone(event));
    console.log(message);
  }
}
