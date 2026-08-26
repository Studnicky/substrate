/** Parses untrusted input into a validated value. */
export interface SchemaIntakeFunctionInterface<TValidated> {
  (input: unknown): TValidated;
}
