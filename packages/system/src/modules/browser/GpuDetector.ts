import type { GpuInfoEntity } from '../../entities/GpuInfoEntity.js';

/**
 * The browser surface this detector reads, declared structurally. The package
 * compiles against `ESNext` only, so DOM lib types are unavailable here.
 */
interface WebglDebugRendererInfoInterface {
  readonly 'UNMASKED_RENDERER_WEBGL': unknown;
  readonly 'UNMASKED_VENDOR_WEBGL': unknown;
}

interface WebglContextInterface {
  getExtension(name: 'WEBGL_debug_renderer_info'): WebglDebugRendererInfoInterface | null;
  getParameter(parameter: unknown): unknown;
}

interface BrowserCanvasInterface {
  getContext(contextId: 'webgl'): WebglContextInterface | null;
}

interface BrowserDocumentInterface {
  createElement(tagName: 'canvas'): BrowserCanvasInterface;
}

/** Resolves the ambient browser `document`, which `globalThis` does not declare. */
class BrowserGlobals {
  static isDocument(value: unknown): value is BrowserDocumentInterface {
    if (typeof value !== 'object' || value === null) { return false; }

    const createElement: unknown = Reflect.get(value, 'createElement');
    return typeof createElement === 'function';
  }

  /** Returns the document as-is, so its methods keep their receiver. */
  static findDocument(): BrowserDocumentInterface | undefined {
    const candidate: unknown = Reflect.get(globalThis, 'document');
    return BrowserGlobals.isDocument(candidate) ? candidate : undefined;
  }
}

export class GpuDetector {
  static detect(): GpuInfoEntity.Type | null {
    try {
      if (!('WebGLRenderingContext' in globalThis)) {
        return null;
      }

      const doc = BrowserGlobals.findDocument();

      if (doc === undefined) {
        return null;
      }

      const canvas = doc.createElement('canvas');
      const gl = canvas.getContext('webgl');

      if (gl === null) {
        return null;
      }

      const ext = gl.getExtension('WEBGL_debug_renderer_info');

      if (ext === null) {
        return null;
      }

      const renderer: unknown = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      const vendor: unknown = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      if (typeof renderer !== 'string' || typeof vendor !== 'string') { return null; }

      return {
        'computeApi': GpuDetector.#mapComputeApi(renderer, vendor),
        'name': renderer,
        'vramMb': null
      };
    } catch {
      return null;
    }
  }

  static #mapComputeApi(renderer: string, vendor: string): GpuInfoEntity.Type['computeApi'] {
    const lowerRenderer = renderer.toLowerCase();
    const lowerVendor = vendor.toLowerCase();

    if (lowerRenderer.includes('nvidia')) {
      return 'cuda';
    }

    if (lowerRenderer.includes('apple') || lowerVendor.includes('apple')) {
      return 'metal';
    }

    return 'opencl';
  }
}
