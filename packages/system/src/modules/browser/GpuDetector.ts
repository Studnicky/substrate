import type { GpuInfoEntity } from '../../entities/GpuInfoEntity.js';

export class GpuDetector {
  static detect(): GpuInfoEntity.Type | null {
    try {
      if (!('WebGLRenderingContext' in globalThis)) {
        return null;
      }

      if (!('document' in globalThis)) {
        return null;
      }

      const doc = (globalThis as unknown as { 'document': Document }).document;
      const canvas = doc.createElement('canvas');
      const gl = canvas.getContext('webgl');

      if (gl === null) {
        return null;
      }

      const ext = gl.getExtension('WEBGL_debug_renderer_info');

      if (ext === null) {
        return null;
      }

      const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
      const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string;

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
