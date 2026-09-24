/** One `{description, data, valid}` case from an official JSON Schema Test Suite file. */
export interface ConformanceCaseInterface {
  readonly 'description': string;
  readonly 'data': unknown;
  readonly 'valid': boolean;
}
