export type FacetAccessorMapType<TRecord, TDimension extends string> = Partial<
  Record<TDimension, (row: TRecord) => string | null>
>;
