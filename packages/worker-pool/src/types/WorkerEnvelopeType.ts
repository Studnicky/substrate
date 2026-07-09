/**
 * Fixed discriminated-union message envelope every worker fixture posts back to the pool.
 *
 * `TMessage` is carried on the type for symmetry with `WorkerPool<TMessage, TResult>` — every
 * envelope variant is independent of the item type a worker receives via `postMessage` — so it
 * is accepted but unused by the union itself.
 */
export type WorkerEnvelopeType<_TMessage = unknown, TResult = unknown> =
  | { 'message': string; 'type': 'log'; }
  | { 'percent': number; 'type': 'progress'; }
  | { 'type': 'result'; 'value': TResult }
  | { 'error': string; 'type': 'error'; };
