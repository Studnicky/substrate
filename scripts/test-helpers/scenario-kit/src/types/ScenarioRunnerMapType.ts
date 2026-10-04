import type { ScenarioCaseOfType } from './ScenarioCaseOfType.js';
import type { ScenarioCaseType } from './ScenarioCaseType.js';

/** One runner per discriminant value; each receives the case branch that value selects. A class with one static method per shape satisfies this. */
export type ScenarioRunnerMapType<TCase extends ScenarioCaseType<TKey>, TKey extends string = 'shape'> = {
  [TShape in TCase[TKey]]: (scenarioCase: ScenarioCaseOfType<TCase, TShape, TKey>) => Promise<void> | void;
};
