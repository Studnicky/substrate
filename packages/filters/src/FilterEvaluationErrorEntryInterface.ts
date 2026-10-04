/** Entry collected in the errors array while evaluating with error reporting enabled. */
export interface FilterEvaluationErrorEntryInterface {
  'actual'?: unknown;
  'expected'?: unknown;
  'field'?: string;
  'gate'?: string;
  'message': string;
  'negate'?: boolean;
  'operator'?: unknown;
  'operatorSource'?: string;
  'path'?: string;
}
