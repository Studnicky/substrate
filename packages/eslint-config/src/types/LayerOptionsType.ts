// Shared options shape for hexagonal-architecture layer-boundary rules
// (layerImportBoundary, domainPurity, adapterOnlyImport) and LayerResolver.
export type LayerOptionsType = {
  'aliasPrefixes'?: Record<string, string>;
  'allowedImports'?: Record<string, string[]>;
  'layers': string[];
  'sourceRoot': string;
};
