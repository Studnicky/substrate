/** One `{description, data, valid}` case from an official JSON Schema Test Suite file. */
export interface ConformanceCaseInterface {
  readonly 'data': unknown;
  readonly 'description': string;
  readonly 'valid': boolean;
}
