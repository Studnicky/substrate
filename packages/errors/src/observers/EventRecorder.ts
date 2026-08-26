/**
 * @module @studnicky/errors
 * @description Records a lifecycle-hook event and logs a trace line in one call —
 * example/demo glue for `onX` hook overrides that both capture and print an event.
 */

export class EventRecorder<T> {
  readonly #events: T[] = [];

  get events(): readonly T[] {
    const result: T[] = [];
    const length = this.#events.length;
    for (let index = 0; index < length; index += 1) {
      const event = this.#events[index];
      if (event !== undefined) {
        result.push(structuredClone(event));
      }
    }
    return result;
  }

  record(event: T, message: string): void {
    this.#events.push(structuredClone(event));
    console.log(message);
  }
}
