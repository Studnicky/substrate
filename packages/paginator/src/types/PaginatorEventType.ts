/**
 * Whether a fetched page was the last one. Modeled as a discriminated union
 * rather than `TCursor | undefined` so that `undefined` can be a legitimate
 * `TCursor` value (e.g. `Paginator<TPage, string | undefined>`) without being
 * mistaken for the exhaustion sentinel.
 */
export type PaginatorNextCursorType<TCursor> =
  | { 'cursor': TCursor; 'exhausted': false; }
  | { 'exhausted': true };

/**
 * Events accepted by the paginator state machine: a page arrived from the
 * caller (with `nextCursor` describing whether more pages remain), or the
 * tracker should return to its initial `idle` state.
 */
export type PaginatorEventType<TPage, TCursor> =
  | { 'nextCursor': PaginatorNextCursorType<TCursor>; 'page': TPage; 'type': 'pageReceived'; }
  | { 'type': 'reset' };
