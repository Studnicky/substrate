/** Registers the `urn:test:Widget` entity reference consumed by the ResolveEntityReferenceType checks. */
declare module '../../../../src/interfaces/EntityReferenceRegistryInterface.js' {
  interface EntityReferenceRegistryInterface {
    'urn:test:Widget': { readonly 'id': string; readonly 'name': string };
  }
}

export {};
