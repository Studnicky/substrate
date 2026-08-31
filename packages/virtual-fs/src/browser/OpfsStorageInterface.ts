interface OpfsFileHandleInterface {
  'createWritable': () => Promise<OpfsWritableFileInterface>;
  'getFile': () => Promise<OpfsFileInterface>;
}

interface OpfsFileInterface {
  'text': () => Promise<string>;
}

interface OpfsWritableFileInterface {
  'close': () => Promise<void>;
  'write': (data: string) => Promise<void>;
}

interface OpfsDirectoryInterface {
  'getDirectoryHandle': (name: string, options?: { readonly 'create'?: boolean }) => Promise<OpfsDirectoryInterface>;
  'getFileHandle': (name: string, options?: { readonly 'create'?: boolean }) => Promise<OpfsFileHandleInterface>;
  'removeEntry': (name: string, options?: { readonly 'recursive'?: boolean }) => Promise<void>;
  'values': () => AsyncIterableIterator<{ readonly 'name': string }>;
}

/** Browser Origin Private File System storage boundary. */
export interface OpfsStorageInterface {
  'getDirectory': () => Promise<OpfsDirectoryInterface>;
}
