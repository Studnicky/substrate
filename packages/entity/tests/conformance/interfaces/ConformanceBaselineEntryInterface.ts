/** One known-failing case an engine's baseline records, to distinguish a tracked gap from a regression. */
export interface ConformanceBaselineEntryInterface {
  readonly 'caseDescription': string;
  readonly 'groupDescription': string;
  readonly 'relativePath': string;
}
