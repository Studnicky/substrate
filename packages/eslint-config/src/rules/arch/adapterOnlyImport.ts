import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LayerOptionsEntity } from '../layers/LayerOptionsEntity.js';
import { LayerResolver } from '../layers/LayerResolver.js';
import { ImportSourceValue } from '../shared/importSourceValue.js';

namespace AdapterOnlyImportOptionsEntity {
  export const Schema = {
    ...LayerOptionsEntity.Schema,
    'properties': {
      ...LayerOptionsEntity.Schema.properties,
      'adapterLayerName': {
        'default': 'adapters',
        'description': 'Name of the layer treated as the adapters layer for exemption purposes. Defaults to "adapters".',
        'type': 'string'
      },
      'adapterOnlyImports': {
        'default': [],
        'description': 'Package names/roots restricted to the adapters layer, e.g. ["express", "pg", "axios"].',
        'items': { 'type': 'string' },
        'type': 'array'
      }
    }
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

class AdapterOnlyMatch {
  public static find(specifier: string, adapterOnlyImports: readonly string[]): string | undefined {
    const entryCount = adapterOnlyImports.length;

    for (let index = 0; index < entryCount; index += 1) {
      const entry = adapterOnlyImports.at(index);

      if (entry !== undefined && (specifier === entry || specifier.startsWith(`${entry}/`))) {
        return entry;
      }
    }

    return undefined;
  }
}

export const adapterOnlyImport: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    if (rawOptions === undefined) { return {}; }
    const options = AdapterOnlyImportOptionsEntity.intake(rawOptions);

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    if (sourceLayer === undefined || sourceLayer === options.adapterLayerName) {
      return {};
    }

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      const specifier = ImportSourceValue.get(node);

      if (specifier === undefined) {
        return;
      }

      const matched = AdapterOnlyMatch.find(specifier, options.adapterOnlyImports);

      if (matched === undefined) {
        return;
      }

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
    'messages': { 'adapterOnlyImport': "Layer '{{layer}}' may not import adapter-only dependency '{{specifier}}' directly. Hide it behind a port/adapter." },
    'schema': [AdapterOnlyImportOptionsEntity.Schema],
    'type': 'problem'
  }
};
