/** The `{ cases: [...] }` envelope every `*.scenarios.json` fixture shares, parametrized by the caller's own case type. */
export interface ScenarioFileTypeInterface<TCase> {
  readonly 'cases': readonly TCase[];
}
