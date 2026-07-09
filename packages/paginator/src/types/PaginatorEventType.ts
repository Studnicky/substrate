/**
 * Events accepted by the paginator state machine: a page arrived from the
 * caller (with the cursor for the next page, or `undefined` if exhausted),
 * or the tracker should return to its initial `idle` state.
 */
export type PaginatorEventType<TPage, TCursor> =
  | { 'nextCursor': TCursor | undefined; 'page': TPage; 'type': 'pageReceived'; }
  | { 'type': 'reset' };
