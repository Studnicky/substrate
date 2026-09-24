/** One failing case: which file, which group, which case, and why. */
export interface ConformanceFailureInterface {
  readonly 'relativePath': string;
  readonly 'groupDescription': string;
  readonly 'caseDescription': string;
  readonly 'expectedValid': boolean;
  readonly 'reason': string;
}
