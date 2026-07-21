import { match, strictEqual } from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { it } from 'node:test';

import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget
} from 'typescript';

import { IdempotencyGuard } from '../../../src/index.js';

class ResultContractCompiler {
  static diagnostics(): string[] {
    const fileName = fileURLToPath(new URL('../../fixtures/idempotency-result-contract.ts', import.meta.url));
    const source = `
      import { IdempotencyGuard } from '../../src/index.js';

      const direct = IdempotencyGuard.create<number>({ capacity: 10, ttlMs: 60_000 });
      await direct.run('direct', {}, () => 'wrong');
    `;
    const options = {
      'module': ModuleKind.NodeNext,
      'moduleResolution': ModuleResolutionKind.NodeNext,
      'noEmit': true,
      'skipLibCheck': true,
      'strict': true,
      'target': ScriptTarget.ES2022
    };
    const host = createCompilerHost(options);
    const fileExists = host.fileExists.bind(host);
    const getSourceFile = host.getSourceFile.bind(host);
    const readFile = host.readFile.bind(host);

    host.fileExists = (candidate): boolean => candidate === fileName || fileExists(candidate);
    host.readFile = (candidate): string | undefined => candidate === fileName ? source : readFile(candidate);
    host.getSourceFile = (candidate, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (candidate === fileName) {
        return createSourceFile(candidate, source, languageVersion, true);
      }
      return getSourceFile(candidate, languageVersion, onError, shouldCreateNewSourceFile);
    };

    const program = createProgram([fileName], options, host);
    return getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.file?.fileName === fileName && diagnostic.code === 2322)
      .map((diagnostic) => flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
}

it('owns one result contract across creation, execution, and replay', async () => {
  const guard = IdempotencyGuard.create<number>({ 'capacity': 10, 'ttlMs': 60_000 });

  const initial = await guard.run('calculation', { 'operand': 7 }, () => 41);
  const replayed = await guard.run('calculation', { 'operand': 7 }, async () => 42);

  strictEqual(initial, 41);
  strictEqual(replayed, 41);
  strictEqual(typeof replayed, 'number');
});

it('rejects factories outside the guard result contract at compile time', () => {
  const diagnostics = ResultContractCompiler.diagnostics();

  strictEqual(diagnostics.length, 1);
  for (const diagnostic of diagnostics) {
    match(diagnostic, /Type 'string' is not assignable to type 'number \| Promise<number>'/u);
  }
});
