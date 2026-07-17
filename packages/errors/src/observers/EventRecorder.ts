/**
 * @module @studnicky/errors/observers
 * @description Records a lifecycle-hook event and logs a trace line in one call —
 * example/demo glue for `onX` hook overrides that both capture and print an event.
 */

export class EventRecorder<T> {
  readonly events: T[] = [];

  record(event: T, message: string): void {
    this.events.push(event);
    console.log(message);
  }
}
