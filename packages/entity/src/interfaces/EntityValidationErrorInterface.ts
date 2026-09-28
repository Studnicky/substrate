/** One normalized schema-validation diagnostic. */
export interface EntityValidationErrorInterface {
  readonly 'instancePath': string;
  readonly 'keyword': string;
  readonly 'message'?: string;
  readonly 'parameters': Readonly<Record<string, unknown>>;
  readonly 'schemaPath': string;
}
