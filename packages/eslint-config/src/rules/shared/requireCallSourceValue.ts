import { ObjectGuard } from './ObjectGuard.js';

export class RequireCallSourceValue {
  public static get(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }

    const args: unknown = node.arguments;
    if (!Array.isArray(args)) { return undefined; }

    const firstArg: unknown = args.at(0);
    if (!ObjectGuard.isObject(firstArg) || firstArg.type !== 'Literal') { return undefined; }

    const value: unknown = firstArg.value;
    return typeof value === 'string' ? value : undefined;
  }
}
