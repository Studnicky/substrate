import { ObjectGuard } from './ObjectGuard.js';

// json-schema-uninexpressible: internal narrowing helper mirroring the shape of ESLint's own Comment token; never serialized or runtime-validated by this package
type CommentToken = { readonly 'type': string; readonly 'value': string };

// json-schema-uninexpressible: 'getCommentsBefore' is function-typed — function types have no JSON Schema equivalent
type SourceCodeLike = { 'getCommentsBefore': (node: unknown) => readonly CommentToken[] };

export class ExemptionComment {
  public static containsDirective(comments: readonly CommentToken[], pattern: RegExp): boolean {
    const length = comments.length;
    for (let index = 0; index < length; index++) {
      const comment = comments[index];
      if (comment?.type === 'Line' && pattern.test(comment.value)) { return true; }
    }
    return false;
  }

  public static isSourceCodeLike(value: unknown): value is SourceCodeLike {
    return ObjectGuard.isObject(value) && typeof value.getCommentsBefore === 'function';
  }

  public static has(rawNode: unknown, rawSourceCode: unknown, pattern: RegExp): boolean {
    if (!ExemptionComment.isSourceCodeLike(rawSourceCode)) { return false; }
    return ExemptionComment.containsDirective(rawSourceCode.getCommentsBefore(rawNode), pattern);
  }

  public static hasWithExportFallback(rawNode: unknown, rawSourceCode: unknown, pattern: RegExp): boolean {
    if (ExemptionComment.has(rawNode, rawSourceCode, pattern)) { return true; }
    if (!ObjectGuard.isObject(rawNode)) { return false; }
    const parent: unknown = rawNode.parent;
    if (ObjectGuard.isObject(parent) && parent.type === 'ExportNamedDeclaration') {
      return ExemptionComment.has(parent, rawSourceCode, pattern);
    }
    return false;
  }
}
