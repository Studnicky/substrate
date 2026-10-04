/**
 * @module @studnicky/errors
 * @description Records a lifecycle-hook event and logs a trace line in one call —
 * example/demo glue for `onX` hook overrides that both capture and print an event.
 */
import { RuntimeError } from '../errors/RuntimeError.js';

export class EventRecorder<T> {
  readonly #events: T[] = [];

  get events(): readonly T[] {
    const result: T[] = [];
    const length = this.#events.length;
    for (let index = 0; index < length; index += 1) {
      const event = this.#events[index];
      if (event !== undefined) {
        result.push(EventRecorder.#snapshot(event));
      }
    }
    return result;
  }

  static #snapshot<TEvent>(event: TEvent): TEvent {
    try {
      const result = structuredClone(event);
      return result;
    } catch (error) {
      throw RuntimeError.create('Recorded event is not structured-cloneable', { 'cause': error });
    }
  }

  record(event: T, message: string): void {
    this.#events.push(EventRecorder.#snapshot(event));
    console.log(message);
  }
}
