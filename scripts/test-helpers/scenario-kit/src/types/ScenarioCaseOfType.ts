import type { ScenarioCaseType } from './ScenarioCaseType.js';

/** The branch of the case union `TCase` whose discriminant `TKey` equals `TShape`. */
export type ScenarioCaseOfType<TCase extends ScenarioCaseType<TKey>, TShape extends TCase[TKey], TKey extends string = 'shape'> = Extract<TCase, { [K in TKey]: TShape }>;
