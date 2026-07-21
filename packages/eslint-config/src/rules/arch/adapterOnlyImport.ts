import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { LayerOptionsEntity } from '../layers/LayerOptionsEntity.js';
import { LayerResolver } from '../layers/LayerResolver.js';
import { ImportSourceValue } from '../shared/importSourceValue.js';

namespace AdapterOnlyImportOptionsEntity {
  export const Schema = {
    ...LayerOptionsEntity.Schema,
    'properties': {
      ...LayerOptionsEntity.Schema.properties,
      'adapterLayerName': {
        'description': 'Name of the layer treated as the adapters layer for exemption purposes. Defaults to "adapters".',
        'type': 'string'
      },
      'adapterOnlyImports': {
        'description': 'Package names/roots restricted to the adapters layer, e.g. ["express", "pg", "axios"].',
        'items': { 'type': 'string' },
        'type': 'array'
      }
    }
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

class AdapterOnlyMatch {
  public static find(specifier: string, adapterOnlyImports: readonly string[]): string | undefined {
    const entriesLen = adapterOnlyImports.length;
    for (let index = 0; index < entriesLen; index += 1) {
      const entry = adapterOnlyImports[index];
      if (entry !== undefined && (specifier === entry || specifier.startsWith(`${entry}/`))) {
        return entry;
      }
    }
    return undefined;
  }
}

export const adapterOnlyImport: Rule.RuleModule = {
  'create': (context) => {
    const options: unknown = context.options.at(0);

    if (!LayerOptionsEntity.validate(options)) { return {}; }

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    const adapterLayerNameValue: unknown = Reflect.get(options, 'adapterLayerName');
    const adapterLayerName = typeof adapterLayerNameValue === 'string' ? adapterLayerNameValue : 'adapters';
    if (sourceLayer === undefined || sourceLayer === adapterLayerName) { return {}; }

    const adapterOnlyImportsValue: unknown = Reflect.get(options, 'adapterOnlyImports');
    if (!Array.isArray(adapterOnlyImportsValue)) { return {}; }
    const adapterOnlyImports: string[] = [];
    const importsLength = adapterOnlyImportsValue.length;
    for (let index = 0; index < importsLength; index += 1) {
      const entry: unknown = adapterOnlyImportsValue.at(index);
      if (typeof entry !== 'string') { return {}; }
      adapterOnlyImports.push(entry);
    }

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      const specifier = ImportSourceValue.get(node);
      if (specifier === undefined) { return; }

      const matched = AdapterOnlyMatch.find(specifier, adapterOnlyImports);
      if (matched === undefined) { return; }

      context.report({
        'data': {
          'layer': sourceLayer,
          'specifier': specifier
        },
        'messageId': 'adapterOnlyImport',
        'node': node
      });
    };

    return { 'ImportDeclaration': onImportDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow importing adapter-only third-party dependencies (concrete HTTP frameworks, database drivers, external API clients) outside the adapters layer of a hexagonal architecture.',
      'recommended': false
    },
    'messages': {
      'adapterOnlyImport': "Layer '{{layer}}' may not import adapter-only dependency '{{specifier}}' directly. Hide it behind a port/adapter."
    },
    'schema': [AdapterOnlyImportOptionsEntity.Schema],
    'type': 'problem'
  }
};
