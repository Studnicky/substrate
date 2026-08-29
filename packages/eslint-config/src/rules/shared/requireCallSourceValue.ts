import { Predicates } from '@studnicky/types';

export class RequireCallSourceValue {
  public static get(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    const argumentList: unknown = node.arguments;

    if (!Array.isArray(argumentList)) {
      return undefined;
    }

    const firstArg: unknown = argumentList.at(0);

    if (!Predicates.isRecord(firstArg) || firstArg.type !== 'Literal') {
      return undefined;
    }

    const value: unknown = firstArg.value;
    const result = typeof value === 'string' ? value : undefined;

    return result;
  }
}
