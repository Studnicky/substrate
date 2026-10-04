/**
 * Fixed per-operation timing driving a `VirtualClockThrottle`'s virtual
 * clock: `startMs` seeds the counter, `advanceOperationStart()` moves it by
 * `operationSpacingMs`, and `advanceOperationDuration()` moves it by
 * `operationDurationMs`.
 */
export interface ThrottleClockInputInterface {
  readonly 'operationDurationMs': number;
  readonly 'operationSpacingMs': number;
  readonly 'startMs': number;
}
