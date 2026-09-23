/** The keyword and resolved schema/param values needed to render one diagnostic message. */
export interface EntityDiagnosticRenderContextInterface {
  readonly 'additionalProperty'?: string | undefined;
  readonly 'containsMaximum'?: number | undefined;
  readonly 'containsMinimum'?: number | undefined;
  readonly 'dependentProperty'?: string | undefined;
  readonly 'keyword': string;
  readonly 'keywordValue'?: unknown;
  readonly 'missingDependentProperties'?: readonly string[] | undefined;
  readonly 'missingProperty'?: string | undefined;
}
