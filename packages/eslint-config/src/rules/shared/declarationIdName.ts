import { Predicates } from '@studnicky/types';

export class DeclarationIdName {
  static get(rawNode: unknown): string {
    if (!Predicates.isRecord(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!Predicates.isRecord(idNode)) { return ''; }
    const name: unknown = idNode.name;
    const result = typeof name === 'string' ? name : '';
    return result;
  }
}
