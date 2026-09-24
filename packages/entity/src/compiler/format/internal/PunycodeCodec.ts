/** RFC 3492 Bootstring codec, parameterized for Punycode (used by IDNA A-labels). */
export class PunycodeCodec {
  private static readonly BASE = 36;
  private static readonly THRESHOLD_LOWER_BOUND = 1;
  private static readonly THRESHOLD_UPPER_BOUND = 26;
  private static readonly SKEW = 38;
  private static readonly DAMP = 700;
  private static readonly INITIAL_BIAS = 72;
  private static readonly INITIAL_CODE_POINT = 128;
  private static readonly DELIMITER = '-';

  /** Decodes a Punycode payload (the part after the `xn--` prefix) to Unicode scalar values. `undefined` on malformed input. */
  public static decode(input: string): number[] | undefined {
    const delimiterIndex = input.lastIndexOf(PunycodeCodec.DELIMITER);
    const output = PunycodeCodec.readBasicCodePoints(input, delimiterIndex);
    if (output === undefined) {
      return undefined;
    }
    let position = delimiterIndex >= 0 ? delimiterIndex + 1 : 0;
    let codePoint = PunycodeCodec.INITIAL_CODE_POINT;
    let bias = PunycodeCodec.INITIAL_BIAS;
    let insertValue = 0;
    while (position < input.length) {
      const previousInsertValue = insertValue;
      const digits = PunycodeCodec.readWeightedDigits(input, position, bias, insertValue);
      if (digits === undefined) {
        return undefined;
      }
      position = digits.position;
      insertValue = digits.value;
      bias = PunycodeCodec.adapt(insertValue - previousInsertValue, output.length + 1, previousInsertValue === 0);
      codePoint += Math.floor(insertValue / (output.length + 1));
      insertValue %= output.length + 1;
      PunycodeCodec.insertCodePoint(output, insertValue, codePoint);
      insertValue += 1;
    }
    return output;
  }

  /** Encodes Unicode scalar values into a Punycode payload (without the `xn--` prefix). */
  public static encode(codePoints: readonly number[]): string {
    const output: string[] = [];
    let basicCount = 0;
    for (let index = 0; index < codePoints.length; index += 1) {
      const codePoint = codePoints[index]!;
      if (codePoint < PunycodeCodec.INITIAL_CODE_POINT) {
        output.push(String.fromCodePoint(codePoint));
        basicCount += 1;
      }
    }
    if (basicCount > 0) {
      output.push(PunycodeCodec.DELIMITER);
    }
    let bias = PunycodeCodec.INITIAL_BIAS;
    let delta = 0;
    let handled = basicCount;
    let currentCodePoint = PunycodeCodec.INITIAL_CODE_POINT;
    while (handled < codePoints.length) {
      const nextCodePoint = PunycodeCodec.findMinimumAtOrAbove(codePoints, currentCodePoint);
      delta += (nextCodePoint - currentCodePoint) * (handled + 1);
      currentCodePoint = nextCodePoint;
      const emitted = PunycodeCodec.emitCodePointOccurrences(codePoints, currentCodePoint, output, { 'bias': bias, 'delta': delta, 'handled': handled }, basicCount);
      bias = emitted.bias;
      delta = emitted.delta + 1;
      handled = emitted.handled;
      currentCodePoint += 1;
    }
    const result = output.join('');
    return result;
  }

  private static readBasicCodePoints(input: string, delimiterIndex: number): number[] | undefined {
    const output: number[] = [];
    const basicPart = delimiterIndex >= 0 ? input.slice(0, delimiterIndex) : '';
    for (let index = 0; index < basicPart.length; index += 1) {
      const codePoint = basicPart.codePointAt(index);
      if (codePoint === undefined || codePoint >= PunycodeCodec.INITIAL_CODE_POINT) {
        return undefined;
      }
      output.push(codePoint);
    }
    return output;
  }

  private static readWeightedDigits(input: string, startPosition: number, bias: number, startValue: number): { 'position': number; 'value': number } | undefined {
    let position = startPosition;
    let value = startValue;
    let weight = 1;
    let k = PunycodeCodec.BASE;
    for (;;) {
      if (position >= input.length) {
        return undefined;
      }
      const digit = PunycodeCodec.decodeDigit(input.charCodeAt(position));
      position += 1;
      if (digit === undefined) {
        return undefined;
      }
      value += digit * weight;
      const threshold = PunycodeCodec.thresholdAt(k, bias);
      if (digit < threshold) {
        break;
      }
      weight *= PunycodeCodec.BASE - threshold;
      k += PunycodeCodec.BASE;
    }
    return { 'position': position, 'value': value };
  }

  private static insertCodePoint(output: number[], index: number, codePoint: number): void {
    output.push(codePoint);
    for (let position = output.length - 1; position > index; position -= 1) {
      output[position] = output[position - 1]!;
    }
    output[index] = codePoint;
  }

  private static findMinimumAtOrAbove(codePoints: readonly number[], threshold: number): number {
    let minimum = Number.POSITIVE_INFINITY;
    for (let index = 0; index < codePoints.length; index += 1) {
      const codePoint = codePoints[index]!;
      if (codePoint >= threshold && codePoint < minimum) {
        minimum = codePoint;
      }
    }
    return minimum;
  }

  private static emitCodePointOccurrences(
    codePoints: readonly number[], currentCodePoint: number, output: string[],
    startState: { 'bias': number; 'delta': number; 'handled': number }, basicCount: number
  ): { 'bias': number; 'delta': number; 'handled': number } {
    let bias = startState.bias;
    let delta = startState.delta;
    let handled = startState.handled;
    for (let index = 0; index < codePoints.length; index += 1) {
      const codePoint = codePoints[index]!;
      if (codePoint < currentCodePoint) {
        delta += 1;
      }
      if (codePoint === currentCodePoint) {
        PunycodeCodec.emitDigits(output, delta, bias);
        bias = PunycodeCodec.adapt(delta, handled + 1, handled === basicCount);
        delta = 0;
        handled += 1;
      }
    }
    return { 'bias': bias, 'delta': delta, 'handled': handled };
  }

  private static emitDigits(output: string[], delta: number, bias: number): void {
    let q = delta;
    let k = PunycodeCodec.BASE;
    for (;;) {
      const threshold = PunycodeCodec.thresholdAt(k, bias);
      if (q < threshold) {
        output.push(PunycodeCodec.encodeDigit(q));
        return;
      }
      output.push(PunycodeCodec.encodeDigit(threshold + ((q - threshold) % (PunycodeCodec.BASE - threshold))));
      q = Math.floor((q - threshold) / (PunycodeCodec.BASE - threshold));
      k += PunycodeCodec.BASE;
    }
  }

  private static thresholdAt(k: number, bias: number): number {
    const result = k <= bias ? PunycodeCodec.THRESHOLD_LOWER_BOUND : Math.min(k - bias, PunycodeCodec.THRESHOLD_UPPER_BOUND);
    return result;
  }

  private static adapt(deltaIn: number, pointCount: number, firstTime: boolean): number {
    let delta = firstTime ? Math.floor(deltaIn / PunycodeCodec.DAMP) : Math.floor(deltaIn / 2);
    delta += Math.floor(delta / pointCount);
    let k = 0;
    while (delta > ((PunycodeCodec.BASE - PunycodeCodec.THRESHOLD_LOWER_BOUND) * PunycodeCodec.THRESHOLD_UPPER_BOUND) / 2) {
      delta = Math.floor(delta / (PunycodeCodec.BASE - PunycodeCodec.THRESHOLD_LOWER_BOUND));
      k += PunycodeCodec.BASE;
    }
    const result = k + Math.floor(((PunycodeCodec.BASE - PunycodeCodec.THRESHOLD_LOWER_BOUND + 1) * delta) / (delta + PunycodeCodec.SKEW));
    return result;
  }

  private static decodeDigit(charCode: number): number | undefined {
    if (charCode >= 0x30 && charCode <= 0x39) {
      const result = charCode - 0x30 + 26;
      return result;
    }
    if (charCode >= 0x41 && charCode <= 0x5a) {
      const result = charCode - 0x41;
      return result;
    }
    if (charCode >= 0x61 && charCode <= 0x7a) {
      const result = charCode - 0x61;
      return result;
    }
    return undefined;
  }

  private static encodeDigit(digit: number): string {
    const result = digit < 26 ? String.fromCharCode(digit + 0x61) : String.fromCharCode(digit - 26 + 0x30);
    return result;
  }
}
