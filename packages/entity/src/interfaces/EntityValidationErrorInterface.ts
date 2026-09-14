const ENTITY_VALIDATION_ERROR_PARAMETERS_KEY = 'params';

/** One normalized schema-validation diagnostic. */
export interface EntityValidationErrorInterface {
  readonly [ENTITY_VALIDATION_ERROR_PARAMETERS_KEY]: Readonly<Record<string, unknown>>;
  readonly 'instancePath': string;
  readonly 'keyword': string;
  readonly 'message'?: string;
  readonly 'schemaPath': string;
}
