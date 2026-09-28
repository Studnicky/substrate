/** JSON Schema 2020-12 annotation keywords: sibling metadata that never constrains instance validation. */
export interface AnnotationKeywordsInterface {
  readonly '$comment'?: string;
  readonly 'default'?: unknown;
  readonly 'deprecated'?: boolean;
  readonly 'description'?: string;
  readonly 'examples'?: readonly unknown[];
  readonly 'readOnly'?: boolean;
  readonly 'title'?: string;
  readonly 'writeOnly'?: boolean;
}
