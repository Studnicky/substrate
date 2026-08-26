/** Iteration callbacks that attribute nested membership checks to their outer call. */

export const ITERATION_METHODS: ReadonlySet<string> = new Set(['every', 'filter', 'find', 'findIndex', 'some']);
