export type FacetFilterStateType<TDimension extends string> = Partial<
  Record<TDimension, ReadonlySet<string> | null>
>;
