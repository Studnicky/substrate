/**
 * State of a paginated data source: no pages fetched yet (`idle`), one or
 * more pages fetched with a cursor for the next page (`hasMore`), or one or
 * more pages fetched with no further pages available (`exhausted`).
 */
export type PaginatorStateType<TPage, TCursor> =
  | { 'variant': 'idle' }
  | { 'cursor': TCursor; 'pages': TPage[]; 'variant': 'hasMore'; }
  | { 'pages': TPage[]; 'variant': 'exhausted'; };
