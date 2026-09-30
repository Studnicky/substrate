import type { ScenarioCaseType } from '../types/ScenarioCaseType.js';
import type { ScenarioRunnerMapType } from '../types/ScenarioRunnerMapType.js';
import type { ScenarioCaseEntityInterface } from './ScenarioCaseEntityInterface.js';

/** Everything `ScenarioSuite` needs to register one scenario file: where the cases come from, how each shape runs, and how the tests are grouped. */
export interface ScenarioSuiteOptionsInterface<TCase extends ScenarioCaseType<TKey>, TKey extends string = 'shape'> {
  /** The scenario-case entity namespace; its `intake` proves every case in `file`. */
  readonly 'entity': ScenarioCaseEntityInterface<TCase>;
  /** Registers tests that belong in the same `describe` but run no scenario case. */
  readonly 'extraTests'?: () => void;
  /** The parsed `*.scenarios.json` content: a `{ cases: [...] }` envelope. */
  readonly 'file': unknown;
  /** The `describe` title. */
  readonly 'name': string;
  /** One runner per discriminant value. */
  readonly 'runners': ScenarioRunnerMapType<TCase, TKey>;
  /** Per-case timeout in milliseconds; omitted means no timeout. */
  readonly 'timeoutMs'?: number;
}
