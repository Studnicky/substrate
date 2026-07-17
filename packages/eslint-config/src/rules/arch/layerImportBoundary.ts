import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../../types/LayerOptionsType.js';

import { layerOptionsSchema } from '../layers/layerOptionsSchema.js';
import { LayerResolver } from '../layers/LayerResolver.js';
import { ImportSourceValue } from '../shared/importSourceValue.js';

export const layerImportBoundary: Rule.RuleModule = {
  'create': (context) => {
    const options = (context.options as unknown[]).at(0) as LayerOptionsType | undefined;

    if (options === undefined) { return {}; }

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    if (sourceLayer === undefined) { return {}; }

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      const specifier = ImportSourceValue.get(node);
      if (specifier === undefined) { return; }

      const targetLayer = LayerResolver.layerForImport(specifier, filename, options);
      if (targetLayer === undefined) { return; }

      if (!LayerResolver.canImport(sourceLayer, targetLayer, options)) {
        context.report({
          'data': {
            'sourceLayer': sourceLayer,
            'specifier': specifier,
            'targetLayer': targetLayer
          },
          'messageId': 'crossLayerImport',
          'node': node
        });
      }
    };

    return { 'ImportDeclaration': onImportDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow imports that cross hexagonal-architecture layer boundaries not permitted by the configured allow-matrix.',
      'recommended': false
    },
    'messages': {
      'crossLayerImport': "Layer '{{sourceLayer}}' may not import from layer '{{targetLayer}}' (import '{{specifier}}'). Check the allowed-imports matrix for this architecture."
    },
    'schema': [layerOptionsSchema],
    'type': 'problem'
  }
};
