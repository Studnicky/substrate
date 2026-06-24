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
    const rawOptions = context.options[0] as Partial<RuleOptionsType> | undefined;
    const options: RuleOptionsType = {
      'exactMatch': rawOptions?.exactMatch ?? DEFAULT_OPTIONS.exactMatch,
      'excludePrefixes': rawOptions?.excludePrefixes ?? DEFAULT_OPTIONS.excludePrefixes,
      'minFields': rawOptions?.minFields ?? DEFAULT_OPTIONS.minFields,
      'nearMatch': rawOptions?.nearMatch ?? DEFAULT_OPTIONS.nearMatch,
      'subsumedMatch': rawOptions?.subsumedMatch ?? DEFAULT_OPTIONS.subsumedMatch
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
      const bodyLen = body.length;

      for (let si = 0; si < bodyLen; si += 1) {
        const statement = body[si]!;

        if (statement.type !== 'ImportDeclaration') {
          continue;
        }
        const source = (statement as unknown as { readonly 'source': RawImportSourceType }).source.value;

        if (isExcluded(source, options.excludePrefixes)) {
          continue;
        }

        const moduleSymbol = services.getSymbolAtLocation(
          (statement as unknown as { readonly 'source': object }).source
        );

        if (moduleSymbol === undefined) {
          continue;
        }

        const exports = checker.getExportsOfModule(moduleSymbol);
        const exportsLen = exports.length;

        for (let i = 0; i < exportsLen; i += 1) {
          const exportSymbol = exports[i]!;
          // Type alias exports: use getDeclaredTypeOfSymbol to get the object type shape.
          // Value exports (const, function): use getTypeOfSymbol to get the runtime value type.
          // Both paths must resolve to an object type with properties to be considered.
          const isTypeAliasExport = (exportSymbol.flags & SymbolFlags.TypeAlias) !== 0;
          const exportType = isTypeAliasExport
            ? checker.getDeclaredTypeOfSymbol(exportSymbol)
            : checker.getTypeOfSymbol(exportSymbol);

          // Skip non-object types (primitives, functions without callable signatures, error types)
          const isObjectType = (exportType.flags & TypeFlags.Object) !== 0;

          if (!isObjectType) {
            continue;
          }

          const props = exportType.getProperties();

          if (props.length > 0) {
            candidates.push({
              'exportName': exportSymbol.getName(),
              'packageName': source,
              'type': exportType
            });
          }
        }
      }

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

      const candidatesLen = candidates.length;
      for (let i = 0; i < candidatesLen; i += 1) {
        const candidate = candidates[i]!;
        const matchResult = classifyMatch(localType, candidate.type, checker, options.minFields);

        if (matchResult === 'off') {
          continue;
        }

        const severity = options[matchResult];

        if (severity === 'off') {
          continue;
        }

        const localName = rawNode.id.name;
        const localProps = localType.getProperties();
        const fields = localProps
          .map((p) => { const result = `'${p.getName()}'`;
            return result; })
          .join(' | ');

        context.report({
          'data': {
            'fields': fields,
            'imported': candidate.exportName,
            'local': localName,
            'package': candidate.packageName
          },
          'messageId': matchResult,
          'node': node
        });

        // Report only the first match per local type
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
