/**
 * A single test scenario with input, expected output (or expected throw code).
 *
 * @module
 */

/** A single test scenario with input, expected output (or expected throw code). */
export type Scenario<TInput, TOutput> = {
  readonly expected: TOutput | { readonly throws: string };
  readonly input: TInput;
  readonly name: string;
};
