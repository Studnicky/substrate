import { BaseError } from '#runtime';

/**
 * Error thrown when the async Context transform receives a module whose file extension
 * is not a supported JavaScript or TypeScript source kind.
 */
export class UnsupportedSourceExtensionError extends BaseError {
  public override readonly name: string = 'UnsupportedSourceExtensionError';

  public readonly extension: string;

  constructor(extension: string) {
    super({ 'code': 'context.unsupportedSourceExtension', 'message': `Unsupported source extension: ${extension}`, 'retryable': false });
    this.extension = extension;
  }
}
