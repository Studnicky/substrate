/** Creates a validated object from trusted partial data. */
export interface SchemaCreateFunctionInterface<TValidated> {
  (partial?: Partial<TValidated>): TValidated;
}
