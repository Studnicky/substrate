/** Data constants for platform-call detection: where a platform declaration may come from and how AST node types map to usage kinds. */

export const NODE_TYPES_PATH = /@types[\\/]node[\\/]/u;

export const ANY = '*';

export const GLOBAL_OWNER = '';

export const NODE_SCHEME = 'node:';

export const NODE_KIND_CALL = 'call';

export const NODE_KIND_CONSTRUCT = 'construct';

export const NODE_KIND_READ = 'read';

export const NODE_KIND_ITERATE = 'iterate';
