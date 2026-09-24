import { APPLICATOR_METASCHEMA } from './metaschema/ApplicatorMetaschema.js';
import { CONTENT_METASCHEMA } from './metaschema/ContentMetaschema.js';
import { CORE_METASCHEMA } from './metaschema/CoreMetaschema.js';
import { FORMAT_ANNOTATION_METASCHEMA } from './metaschema/FormatAnnotationMetaschema.js';
import { META_DATA_METASCHEMA } from './metaschema/MetaDataMetaschema.js';
import { SCHEMA_METASCHEMA } from './metaschema/SchemaMetaschema.js';
import { UNEVALUATED_METASCHEMA } from './metaschema/UnevaluatedMetaschema.js';
import { VALIDATION_METASCHEMA } from './metaschema/ValidationMetaschema.js';

const METASCHEMA_DOCUMENTS: readonly { readonly '$id': string }[] = [
  SCHEMA_METASCHEMA, CORE_METASCHEMA, APPLICATOR_METASCHEMA, UNEVALUATED_METASCHEMA,
  VALIDATION_METASCHEMA, META_DATA_METASCHEMA, FORMAT_ANNOTATION_METASCHEMA, CONTENT_METASCHEMA
];

/** The official draft 2020-12 metaschema documents, resolvable by their own `$id` without network I/O or filesystem reads. */
export class KnownMetaschemaRegistry {
  public static readonly remoteSchemas: ReadonlyMap<string, object> = KnownMetaschemaRegistry.load();

  private static load(): ReadonlyMap<string, object> {
    const result = new Map<string, object>();
    METASCHEMA_DOCUMENTS.forEach((document) => {
      result.set(document.$id, document);
    });
    return result;
  }
}
