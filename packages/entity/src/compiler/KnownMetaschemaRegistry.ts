import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const METASCHEMA_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), 'metaschema');
const METASCHEMA_FILENAMES = Object.freeze([
  'schema.json', 'core.json', 'applicator.json', 'unevaluated.json',
  'validation.json', 'meta-data.json', 'format-annotation.json', 'content.json'
]);

/** The official draft 2020-12 metaschema documents, resolvable by their own `$id` without network I/O. */
export class KnownMetaschemaRegistry {
  public static readonly remoteSchemas: ReadonlyMap<string, object> = KnownMetaschemaRegistry.load();

  private static load(): ReadonlyMap<string, object> {
    const result = new Map<string, object>();
    METASCHEMA_FILENAMES.forEach((filename) => {
      const document = JSON.parse(readFileSync(resolve(METASCHEMA_DIRECTORY, filename), 'utf8')) as { readonly '$id': string };
      result.set(document.$id, document);
    });
    return result;
  }
}
