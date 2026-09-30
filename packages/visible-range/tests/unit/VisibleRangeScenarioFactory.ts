import { VisibleRange } from '../../src/index.js';

/** Builds configured `VisibleRange` instances from serialized scenario input. */
export class VisibleRangeScenarioFactory {
  public static createRange(
    input: {
      readonly 'scrollOffset'?: number;
      readonly 'viewportSize'?: number;
      readonly 'visibleRange': {
        readonly 'count': number;
        readonly 'estimateSizeMode'?: 'fractional-boundary';
        readonly 'estimateSizeValue'?: number;
        readonly 'itemSize'?: number;
        readonly 'overscan'?: number;
      };
    },
    rangeType: typeof VisibleRange = VisibleRange
  ): VisibleRange {
    const { visibleRange } = input;
    const config = {
      'count': visibleRange.count,
      ...(visibleRange.itemSize === undefined ? {} : { 'itemSize': visibleRange.itemSize }),
      ...(visibleRange.overscan === undefined ? {} : { 'overscan': visibleRange.overscan })
    };

    const range = VisibleRangeScenarioFactory.createConfigured(rangeType, visibleRange, config);

    if (input.scrollOffset !== undefined) {
      range.setScrollOffset(input.scrollOffset);
    }
    if (input.viewportSize !== undefined) {
      range.setViewportSize(input.viewportSize);
    }
    return range;
  }

  private static createConfigured(
    rangeType: typeof VisibleRange,
    visibleRange: { readonly 'estimateSizeMode'?: 'fractional-boundary'; readonly 'estimateSizeValue'?: number },
    config: object
  ): VisibleRange {
    if (visibleRange.estimateSizeMode === 'fractional-boundary') {
      const fractional = VisibleRangeScenarioFactory.createFractionalBoundary(rangeType, config);
      return fractional;
    }
    if (visibleRange.estimateSizeValue !== undefined) {
      const constant = VisibleRangeScenarioFactory.createConstantEstimate(rangeType, config, visibleRange.estimateSizeValue);
      return constant;
    }
    const plain = VisibleRangeScenarioFactory.createFixedOrUnsized(rangeType, config);
    return plain;
  }

  private static createConstantEstimate(rangeType: typeof VisibleRange, config: object, estimateSizeValue: number): VisibleRange {
    const range = rangeType.create(config, { 'estimateSize': () => { return estimateSizeValue; } });
    return range;
  }

  private static createFixedOrUnsized(rangeType: typeof VisibleRange, config: object): VisibleRange {
    const range = rangeType.create(config);
    return range;
  }

  private static createFractionalBoundary(rangeType: typeof VisibleRange, config: object): VisibleRange {
    const range = rangeType.create(config, { 'estimateSize': (index: number): number => {
      const size = index === 1 ? 0.5 : 1;
      return size;
    } });
    return range;
  }
}
