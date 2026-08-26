/** Structural contract for a raw ESTree/ESLint AST node: arbitrary string-keyed properties. */
export interface AstNodeInterface {
  readonly [key: string]: unknown;
}
