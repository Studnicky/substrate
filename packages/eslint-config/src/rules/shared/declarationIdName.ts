import { ObjectGuard } from './ObjectGuard.js';

export class DeclarationIdName {
  static get(rawNode: unknown): string {
    if (!ObjectGuard.isObject(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!ObjectGuard.isObject(idNode)) { return ''; }
    const name: unknown = idNode.name;
    return typeof name === 'string' ? name : '';
  }
}
