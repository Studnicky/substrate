interface RawSourceLoaderInterface {
  (): Promise<string>;
}

const RAW_SOURCE_LOADERS = import.meta.glob<string>(
  [
    '../../../../packages/*/examples/**/*.ts',
    '!../../../../packages/context/examples/**/*.ts',
    '!../../../../packages/eslint-config/examples/**/*.ts',
    '!../../../../packages/worker-pool/examples/**/*.ts'
  ],
  { query: '?raw', import: 'default' }
);

const LOADERS_BY_CANONICAL: Record<string, RawSourceLoaderInterface> = {};
const LOADED_SOURCES = new Map<string, string>();
const PENDING_SOURCES = new Map<string, Promise<string>>();

for (const [key, loader] of Object.entries(RAW_SOURCE_LOADERS)) {
  const canonical = key.replace(/^(\.\.\/)+/, '').replace(/\.ts$/, '');
  LOADERS_BY_CANONICAL[canonical] = loader;
}

function resolveCanonical(canonical: string): string | undefined {
  if (canonical in LOADERS_BY_CANONICAL) {
    return canonical;
  }

  const indexCanonical = `${canonical}/index`;
  return indexCanonical in LOADERS_BY_CANONICAL ? indexCanonical : undefined;
}

/** Demand-loaded raw source registry for browser playground examples. */
export class ExampleSources {
  static async get(canonical: string): Promise<string | undefined> {
    const resolved = resolveCanonical(canonical);

    if (resolved === undefined) {
      return undefined;
    }

    const loaded = LOADED_SOURCES.get(resolved);

    if (loaded !== undefined) {
      return loaded;
    }

    let pending = PENDING_SOURCES.get(resolved);

    if (pending === undefined) {
      pending = LOADERS_BY_CANONICAL[resolved]();
      PENDING_SOURCES.set(resolved, pending);
    }

    try {
      const source = await pending;
      LOADED_SOURCES.set(resolved, source);
      return source;
    } finally {
      PENDING_SOURCES.delete(resolved);
    }
  }

  static getLoaded(canonical: string): string | undefined {
    const resolved = resolveCanonical(canonical);
    return resolved === undefined ? undefined : LOADED_SOURCES.get(resolved);
  }
}
