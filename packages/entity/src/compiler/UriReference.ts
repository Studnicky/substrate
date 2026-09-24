import type { ResolvedUriReferenceInterface } from './interfaces/ResolvedUriReferenceInterface.js';

import { URI_REFERENCE_CONSTANTS } from './constants/UriReferenceConstants.js';

/** Resolves a URI-reference (`$id`/`$ref`/`$dynamicRef`) against a base URI per RFC 3986 §5. */
export class UriReference {
  public static resolve(reference: string, baseUri: string): ResolvedUriReferenceInterface {
    const hashIndex = reference.indexOf('#');
    const referenceBase = hashIndex === -1 ? reference : reference.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? '' : UriReference.decodeFragment(reference.slice(hashIndex + 1));
    const baseOnly = UriReference.withoutFragment(baseUri);
    if (referenceBase === '') {
      return { 'base': baseOnly, 'fragment': fragment };
    }
    if (URI_REFERENCE_CONSTANTS.schemePattern.test(referenceBase)) {
      return { 'base': referenceBase, 'fragment': fragment };
    }
    const merged = UriReference.merge(baseOnly, referenceBase);
    return { 'base': merged, 'fragment': fragment };
  }

  /** JSON Pointer/anchor fragments in a `$ref` are percent-encoded per RFC 3986; malformed sequences pass through unchanged. */
  private static decodeFragment(fragment: string): string {
    try {
      const result = decodeURIComponent(fragment);
      return result;
    } catch {
      return fragment;
    }
  }

  private static withoutFragment(uri: string): string {
    const hashIndex = uri.indexOf('#');
    const result = hashIndex === -1 ? uri : uri.slice(0, hashIndex);
    return result;
  }

  /** RFC 3986 §5.3 merge: an absolute-path reference replaces the base's path; otherwise it joins the base's directory. */
  private static merge(baseUri: string, relativePath: string): string {
    if (baseUri === '') { return relativePath; }
    const prefixMatch = URI_REFERENCE_CONSTANTS.schemeAuthorityPattern.exec(baseUri);
    const prefix = prefixMatch === null ? '' : prefixMatch[0];
    const basePath = baseUri.slice(prefix.length);
    const path = relativePath.startsWith('/') ? relativePath : UriReference.mergeRelative(basePath, relativePath);
    const result = prefix + UriReference.removeDotSegments(path);
    return result;
  }

  private static mergeRelative(basePath: string, relativePath: string): string {
    const lastSlash = basePath.lastIndexOf('/');
    const directory = lastSlash === -1 ? '' : basePath.slice(0, lastSlash + 1);
    const result = directory + relativePath;
    return result;
  }

  /** RFC 3986 §5.2.4: collapses `.`/`..` segments left to right. */
  private static removeDotSegments(path: string): string {
    const output: string[] = [];
    let input = path;
    while (input.length > 0) {
      if (input.startsWith('../')) { input = input.slice(3); continue; }
      if (input.startsWith('./')) { input = input.slice(2); continue; }
      if (input.startsWith('/./')) { input = `/${input.slice(3)}`; continue; }
      if (input === '/.') { input = '/'; continue; }
      if (input.startsWith('/../')) { input = `/${input.slice(4)}`; output.pop(); continue; }
      if (input === '/..') { input = '/'; output.pop(); continue; }
      if (input === '.' || input === '..') { break; }
      const segmentMatch = URI_REFERENCE_CONSTANTS.leadingSegmentPattern.exec(input)!;
      output.push(segmentMatch[0]);
      input = input.slice(segmentMatch[0].length);
    }
    const result = output.join('');
    return result;
  }
}
