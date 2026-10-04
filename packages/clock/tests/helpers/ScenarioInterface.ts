/**
 * A single test scenario with input, expected output (or expected throw code).
 *
 * @module
 */

/** The code a scenario expects its execution to throw. */
interface ScenarioThrowInterface {
  readonly 'throws': string;
}

/** A single test scenario with input, expected output (or expected throw code). */
export interface ScenarioInterface<TInput, TOutput> {
  readonly 'expected': ScenarioThrowInterface | TOutput;
  readonly 'input': TInput;
  readonly 'name': string;
}
