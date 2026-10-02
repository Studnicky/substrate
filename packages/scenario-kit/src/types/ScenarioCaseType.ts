/** A scenario case: a `name` for the test title plus a string discriminant stored under `TKey`. */
export type ScenarioCaseType<TKey extends string> = { 'name': string } & { [K in TKey]: string };
