export class LockPathHelpers {
  static dirname(path: string): string {
    const idx = path.lastIndexOf('/');
    if (idx === -1) { return '.'; }
    if (idx === 0) { return '/'; }
    const result = path.slice(0, idx);
    return result;
  }

  static basename(path: string): string {
    const idx = path.lastIndexOf('/');
    const result = path.slice(idx + 1);
    return result;
  }
}
