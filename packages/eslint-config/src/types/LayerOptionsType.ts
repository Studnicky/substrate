// Shared options shape for hexagonal-architecture layer-boundary rules
// (layerImportBoundary, domainPurity, adapterOnlyImport) and LayerResolver.
// json-schema-uninexpressible: ESLint rule-options shape, not domain data — already validated at runtime by ESLint's own meta.schema mechanism via 'rules/layers/layerOptionsSchema.ts', not this package's entity/data layer
export type LayerOptionsType = {
  'aliasPrefixes'?: Record<string, string>;
  'allowedImports'?: Record<string, string[]>;
  'layers': string[];
  'sourceRoot': string;
};
