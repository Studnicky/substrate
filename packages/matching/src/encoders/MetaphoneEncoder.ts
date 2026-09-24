import { INITIAL_WH } from '../constants/INITIAL_WH.js';
import { INITIAL_X } from '../constants/INITIAL_X.js';
import { NON_ASCII_LETTER } from '../constants/NON_ASCII_LETTER.js';
import { REPEATED_CHARACTER } from '../constants/REPEATED_CHARACTER.js';
import { SILENT_INITIAL } from '../constants/SILENT_INITIAL.js';
import { StringNormalizer } from '../normalizers/StringNormalizer.js';

interface MetaphoneStepResultInterface {
  readonly 'advance': number;
  readonly 'output': string;
}

interface MetaphoneStepFunctionInterface {
  (source: string, index: number): MetaphoneStepResultInterface;
}

export class MetaphoneEncoder {
  static encode(value: string): string {
    let source = StringNormalizer.normalize(value).replace(NON_ASCII_LETTER, '');
    if (source.length === 0) {
      return '';
    }
    source = MetaphoneEncoder.stripSilentPrefixes(source);
    const result: string[] = [];
    let index = 0;
    while (index < source.length) {
      const character = source[index];
      if (character === undefined) {
        break;
      }
      const step = MetaphoneEncoder.rules.get(character) ?? MetaphoneEncoder.encodeDefault;
      const stepResult = step(source, index);
      if (stepResult.output.length > 0) {
        result.push(stepResult.output);
      }
      index += stepResult.advance;
    }
    const encoded = result.join('').replace(REPEATED_CHARACTER, '$1').toUpperCase();
    return encoded;
  }

  /** Rewrites known silent-initial digraphs (kn/gn/pn/wr/x/wh) before the per-character scan. */
  private static stripSilentPrefixes(source: string): string {
    const withoutSilentInitial = source.replace(SILENT_INITIAL, (match): string => {
      const result = match.slice(1);
      return result;
    });
    const stripped = withoutSilentInitial.replace(INITIAL_X, 's').replace(INITIAL_WH, 'w');
    return stripped;
  }

  private static encodeVowel(source: string, index: number): MetaphoneStepResultInterface {
    const character = source[index] ?? '';
    return { 'advance': 1, 'output': index === 0 ? character : '' };
  }

  private static encodeB(source: string, index: number): MetaphoneStepResultInterface {
    const previous = source[index - 1] ?? '';
    const silent = previous === 'm' && index === source.length - 1;
    return { 'advance': 1, 'output': silent ? '' : 'b' };
  }

  private static encodeC(source: string, index: number): MetaphoneStepResultInterface {
    const pair = `c${source[index + 1] ?? ''}`;
    if (pair === 'ch') {
      return { 'advance': 2, 'output': 'x' };
    }
    if (pair === 'ci' || pair === 'ce' || pair === 'cy') {
      return { 'advance': 2, 'output': 's' };
    }
    return { 'advance': 1, 'output': 'k' };
  }

  private static encodeD(source: string, index: number): MetaphoneStepResultInterface {
    const pair = `d${source[index + 1] ?? ''}`;
    if (pair === 'dg' && 'eiy'.includes(source[index + 2] ?? '')) {
      return { 'advance': 3, 'output': 'j' };
    }
    return { 'advance': 1, 'output': 't' };
  }

  private static encodeG(source: string, index: number): MetaphoneStepResultInterface {
    const next = source[index + 1] ?? '';
    const pair = `g${next}`;
    if (pair === 'gh' || pair === 'gn') {
      return { 'advance': 2, 'output': '' };
    }
    if ('eiy'.includes(next)) {
      return { 'advance': 1, 'output': 'j' };
    }
    return { 'advance': 1, 'output': 'k' };
  }

  private static encodeH(source: string, index: number): MetaphoneStepResultInterface {
    const previous = source[index - 1] ?? '';
    const next = source[index + 1] ?? '';
    const sounded = 'aeiou'.includes(previous) && 'aeiou'.includes(next);
    return { 'advance': 1, 'output': sounded ? 'h' : '' };
  }

  private static encodeK(source: string, index: number): MetaphoneStepResultInterface {
    const previous = source[index - 1] ?? '';
    return { 'advance': 1, 'output': previous === 'c' ? '' : 'k' };
  }

  private static encodeP(source: string, index: number): MetaphoneStepResultInterface {
    const next = source[index + 1] ?? '';
    if (next === 'h') {
      return { 'advance': 2, 'output': 'f' };
    }
    return { 'advance': 1, 'output': 'p' };
  }

  private static encodeQ(): MetaphoneStepResultInterface {
    return { 'advance': 1, 'output': 'k' };
  }

  private static encodeS(source: string, index: number): MetaphoneStepResultInterface {
    const pair = `s${source[index + 1] ?? ''}`;
    if (pair === 'sh') {
      return { 'advance': 2, 'output': 'x' };
    }
    const triplet = source.slice(index, index + 3);
    if (triplet === 'sio' || triplet === 'sia') {
      return { 'advance': 3, 'output': 'x' };
    }
    return { 'advance': 1, 'output': 's' };
  }

  private static encodeT(source: string, index: number): MetaphoneStepResultInterface {
    const pair = `t${source[index + 1] ?? ''}`;
    if (pair === 'th') {
      return { 'advance': 2, 'output': '0' };
    }
    const triplet = source.slice(index, index + 3);
    if (triplet === 'tia' || triplet === 'tio') {
      return { 'advance': 3, 'output': 'x' };
    }
    if (pair !== 'tch') {
      return { 'advance': 1, 'output': 't' };
    }
    return { 'advance': 1, 'output': '' };
  }

  private static encodeV(): MetaphoneStepResultInterface {
    return { 'advance': 1, 'output': 'f' };
  }

  private static encodeGlide(source: string, index: number): MetaphoneStepResultInterface {
    const character = source[index] ?? '';
    const next = source[index + 1] ?? '';
    return { 'advance': 1, 'output': 'aeiou'.includes(next) ? character : '' };
  }

  private static encodeX(): MetaphoneStepResultInterface {
    return { 'advance': 1, 'output': 'ks' };
  }

  private static encodeZ(): MetaphoneStepResultInterface {
    return { 'advance': 1, 'output': 's' };
  }

  private static encodeDefault(source: string, index: number): MetaphoneStepResultInterface {
    return { 'advance': 1, 'output': source[index] ?? '' };
  }

  private static readonly rules: ReadonlyMap<string, MetaphoneStepFunctionInterface> = new Map([
    ['a', MetaphoneEncoder.encodeVowel],
    ['b', MetaphoneEncoder.encodeB],
    ['c', MetaphoneEncoder.encodeC],
    ['d', MetaphoneEncoder.encodeD],
    ['e', MetaphoneEncoder.encodeVowel],
    ['g', MetaphoneEncoder.encodeG],
    ['h', MetaphoneEncoder.encodeH],
    ['i', MetaphoneEncoder.encodeVowel],
    ['k', MetaphoneEncoder.encodeK],
    ['o', MetaphoneEncoder.encodeVowel],
    ['p', MetaphoneEncoder.encodeP],
    ['q', MetaphoneEncoder.encodeQ],
    ['s', MetaphoneEncoder.encodeS],
    ['t', MetaphoneEncoder.encodeT],
    ['u', MetaphoneEncoder.encodeVowel],
    ['v', MetaphoneEncoder.encodeV],
    ['w', MetaphoneEncoder.encodeGlide],
    ['x', MetaphoneEncoder.encodeX],
    ['y', MetaphoneEncoder.encodeGlide],
    ['z', MetaphoneEncoder.encodeZ]
  ]);
}
