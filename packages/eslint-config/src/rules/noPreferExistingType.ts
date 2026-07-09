import type { Rule } from 'eslint';

import { type Program, type Symbol, SymbolFlags, type Type, type TypeChecker, TypeFlags } from 'typescript';

type SeverityType = 'error' | 'off' | 'warn';

type RuleOptionsType = {
  readonly 'exactMatch': SeverityType;
  readonly 'excludePrefixes': readonly string[];
  readonly 'minFields': number;
  readonly 'nearMatch': SeverityType;
  readonly 'subsumedMatch': SeverityType;
};

const DEFAULT_OPTIONS: RuleOptionsType = {
  'exactMatch': 'error',
  'excludePrefixes': ['@types/', 'node:'],
  'minFields': 2,
  'nearMatch': 'warn',
  'subsumedMatch': 'warn'
};

type MatchResultType = 'exactMatch' | 'nearMatch' | 'off' | 'subsumedMatch';

type CheckerWithAssignable = TypeChecker & {
  readonly 'isTypeAssignableTo': (a: Type, b: Type) => boolean;
};

const isTypeAssignable = (checker: TypeChecker, a: Type, b: Type): boolean => {
  const result = (checker as unknown as CheckerWithAssignable).isTypeAssignableTo(a, b);
  return result;
};

const isOptionalSymbol = (symbol: Symbol): boolean => {
  return (symbol.flags & SymbolFlags.Optional) !== 0;
};

const classifyMatch = (
  localType: Type,
  importedType: Type,
  checker: TypeChecker,
  minFields: number
): MatchResultType => {
  const localProps = localType.getProperties();

  if (localProps.length < minFields) {
    return 'off';
  }

  // Gate 1: does imported fully cover local?
  // imported assignable to local = imported satisfies local's required shape
  const importedCoversLocal = isTypeAssignable(checker, importedType, localType);

  if (!importedCoversLocal) {
    return 'off';
  }

  // Gate 2: mutual coverage (bidirectional)?
  const localCoversImported = isTypeAssignable(checker, localType, importedType);

  if (!localCoversImported) {
    return 'subsumedMatch';
  }

  // Gate 3: both cover each other — distinguish exact vs near by property counts
  const importedProps = importedType.getProperties();
  const localReqCount = localProps.filter((p) => { return !isOptionalSymbol(p); }).length;
  const importedReqCount = importedProps.filter((p) => { return !isOptionalSymbol(p); }).length;
  const localOptCount = localProps.length - localReqCount;
  const importedOptCount = importedProps.length - importedReqCount;

  if (localReqCount === importedReqCount && localOptCount === importedOptCount) {
    return 'exactMatch';
  }

  return 'nearMatch';
};

type ParserServicesType = {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
};

type SourceCodeServicesAccessorType = {
  readonly 'parserServices'?: ParserServicesType;
};

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesType | undefined {
    const result = (context.sourceCode as unknown as SourceCodeServicesAccessorType).parserServices;
    return result;
  }
}

type RawImportSourceType = {
  readonly 'value': string;
};

type RawTSTypeAliasDeclarationType = {
  readonly 'id': object & {
    readonly 'name': string;
  };
  readonly 'typeAnnotation': {
    readonly 'type': string;
  };
};

const isExcluded = (source: string, excludePrefixes: readonly string[]): boolean => {
  const result = excludePrefixes.some((prefix) => { const result = source.startsWith(prefix);
    return result; });
  return result;
};

type ImportedCandidateType = {
  readonly 'exportName': string;
  readonly 'packageName': string;
  readonly 'type': Type;
};

export const noPreferExistingType: Rule.RuleModule = {
  'create': (context) => {
    const optionsArray = context.options as unknown[] | undefined;
    const rawOptions = Array.isArray(optionsArray)
      ? (optionsArray.at(0) as Partial<RuleOptionsType> | undefined)
      : undefined;
    const exactMatch = rawOptions?.exactMatch ?? DEFAULT_OPTIONS.exactMatch;
    const excludePrefixes = rawOptions?.excludePrefixes ?? DEFAULT_OPTIONS.excludePrefixes;
    const minFields = rawOptions?.minFields ?? DEFAULT_OPTIONS.minFields;
    const nearMatch = rawOptions?.nearMatch ?? DEFAULT_OPTIONS.nearMatch;
    const subsumedMatch = rawOptions?.subsumedMatch ?? DEFAULT_OPTIONS.subsumedMatch;

    const options: RuleOptionsType = {
      'exactMatch': exactMatch,
      'excludePrefixes': excludePrefixes,
      'minFields': minFields,
      'nearMatch': nearMatch,
      'subsumedMatch': subsumedMatch
    };

    const services = ContextHelpers.getServices(context);

    if (services?.program === undefined) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    let cachedCandidates: ImportedCandidateType[] | undefined = undefined;

    const getCandidates = (): ImportedCandidateType[] => {
      if (cachedCandidates !== undefined) {
        return cachedCandidates;
      }

      const candidates: ImportedCandidateType[] = [];
      const { body } = context.sourceCode.ast;

      body.forEach((statement) => {
        if (statement.type !== 'ImportDeclaration') {
          return;
        }
        const source = (statement as unknown as { readonly 'source': RawImportSourceType }).source.value;

        if (isExcluded(source, options.excludePrefixes)) {
          return;
        }

        const moduleSymbol = services.getSymbolAtLocation(
          (statement as unknown as { readonly 'source': object }).source
        );

        if (moduleSymbol === undefined) {
          return;
        }

        const exports = checker.getExportsOfModule(moduleSymbol);

        exports.forEach((exportSymbol) => {
          const isTypeAliasExport = (exportSymbol.flags & SymbolFlags.TypeAlias) !== 0;
          const exportType = isTypeAliasExport
            ? checker.getDeclaredTypeOfSymbol(exportSymbol)
            : checker.getTypeOfSymbol(exportSymbol);

          const isObjectType = (exportType.flags & TypeFlags.Object) !== 0;

          if (!isObjectType) {
            return;
          }

          const props = exportType.getProperties();

          if (props.length > 0) {
            candidates.push({
              'exportName': exportSymbol.getName(),
              'packageName': source,
              'type': exportType
            });
          }
        });
      });

      cachedCandidates = candidates;
      return cachedCandidates;
    };

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const rawNode = node as unknown as RawTSTypeAliasDeclarationType;

      if (rawNode.typeAnnotation.type !== 'TSTypeLiteral') {
        return;
      }

      const candidates = getCandidates();

      if (candidates.length === 0) {
        return;
      }

      // Get the declared symbol for the type alias id, then the declared type
      // This handles the TSTypeAliasDeclaration correctly via the checker API
      const aliasSymbol = services.getSymbolAtLocation(rawNode.id);
      const localType = aliasSymbol !== undefined
        ? checker.getDeclaredTypeOfSymbol(aliasSymbol)
        : services.getTypeAtLocation(rawNode.typeAnnotation);

      const localName = rawNode.id.name;
      const localProps = localType.getProperties();
      const fields = localProps
        .map((p) => { const name = p.getName(); return `'${name}'`; })
        .join(' | ');

      for (const candidate of candidates) {
        const matchResult = classifyMatch(localType, candidate.type, checker, options.minFields);

        if (matchResult === 'off') {
          continue;
        }

        let severity: SeverityType;
        if (matchResult === 'exactMatch') {
          severity = options.exactMatch;
        } else if (matchResult === 'nearMatch') {
          severity = options.nearMatch;
        } else if (matchResult === 'subsumedMatch') {
          severity = options.subsumedMatch;
        } else {
          continue;
        }

        if (severity === 'off') {
          continue;
        }

        const reportData = {
          'fields': fields,
          'imported': candidate.exportName,
          'local': localName,
          'package': candidate.packageName
        };
        context.report({
          'data': reportData,
          'messageId': matchResult,
          'node': node
        });

        return;
      }
    };

    return {
      'TSTypeAliasDeclaration': onTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow locally-declared object types whose shape is already provided by an imported package.',
      'recommended': false
    },
    'messages': {
      'exactMatch': "Type '{{local}}' duplicates '{{imported}}' from '{{package}}'. Delete the local declaration and import '{{imported}}' directly.",
      'nearMatch': "Type '{{local}}' matches all required fields of '{{imported}}' from '{{package}}' but differs in optional fields. Use '{{imported}}' or compose with it.",
      'subsumedMatch': "Type '{{local}}' is fully subsumed by '{{imported}}' from '{{package}}'. Consider using Pick<{{imported}}, {{fields}}> or importing '{{imported}}' directly."
    },
    'schema': [
      {
        'additionalProperties': false,
        'properties': {
          'exactMatch': {
            'default': 'error',
            'enum': ['error', 'off', 'warn'],
            'type': 'string'
          },
          'excludePrefixes': {
            'default': ['@types/', 'node:'],
            'items': { 'type': 'string' },
            'type': 'array'
          },
          'minFields': {
            'default': 2,
            'minimum': 0,
            'type': 'integer'
          },
          'nearMatch': {
            'default': 'warn',
            'enum': ['error', 'off', 'warn'],
            'type': 'string'
          },
          'subsumedMatch': {
            'default': 'warn',
            'enum': ['error', 'off', 'warn'],
            'type': 'string'
          }
        },
        'type': 'object'
      }
    ],
    'type': 'suggestion'
  }
};
