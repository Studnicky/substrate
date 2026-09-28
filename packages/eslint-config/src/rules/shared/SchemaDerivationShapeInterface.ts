import type { Node, TypeQueryNode } from 'typescript';

export interface SchemaDerivationShapeInterface {
  readonly 'derivingNameNode': Node | undefined;
  readonly 'valueQuery': TypeQueryNode;
}
