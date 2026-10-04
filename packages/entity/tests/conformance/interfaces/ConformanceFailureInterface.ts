/** One failing case: which file, which group, which case, and why. */
export interface ConformanceFailureInterface {
  readonly 'caseDescription': string;
  readonly 'expectedValid': boolean;
  readonly 'groupDescription': string;
  readonly 'reason': string;
  readonly 'relativePath': string;
}
