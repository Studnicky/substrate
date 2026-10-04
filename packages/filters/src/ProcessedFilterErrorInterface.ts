/** Validator-like shape returned from {@link FilterEngine.evaluate}. */
export interface ProcessedFilterErrorInterface {
  'field': string;
  'message': string;
  'operator': unknown;
  'parameters'?: { 'expected': unknown };
  'source': string;
  'value': unknown;
}
